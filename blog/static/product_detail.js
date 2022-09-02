// モール連携ステータス系は別ファイルに分割 -> update_mall_status.js

jQuery(function () {
    // API
    const Util = {
        URLS: {
            GetJsonMasters: '/product/detail/get_json_masters',
            PostXeditableData: '/product/detail/post_xeditable',
            GetSpecs: '/product/detail/get_specs',
            PostSpecs: '/product/detail/post_specs',
            DeleteSku: '/product/detail/delete_sku',
            CreateSku: '/product/detail/add_sku',
            UpdateMallStatus: '/product/detail/update_mall_status',
            UpdateSkuProperPrice: '/product/detail/update_sku_proper_prices',
            UpdateProductOption: '/product/detail/update_product_option',
            UpdateOrCreateWashRow: '/product/detail/create_or_update_wash_row',
            UpdateWash: '/product/detail/update_wash',
            UpdateStamp: '/product/detail/save_stamp',
            UpdatePriority: '/product/detail/update_priority',
            CheckProductCode: '/product/detail/check_product_code',
            SaveStamp: '/product/detail/save_stamp'
        }
    };

    $.LoadingOverlaySetup({ size: 30, minSize: 10, maxSize: 50 });

    // 入力必須項目のidを指定する (.editable-text のみ対応)
    const Requirements = [];

    // Xeditable のデフォルト設定
    $.fn.editable.defaults.mode = 'inline';
    $.fn.editable.defaults.ajaxOptions = { type: "PUT" };
    $.fn.editable.defaults.emptytext = '？？？';
    $.fn.editable.defaults.anim = '1';

    var request = function (arg, complete) {
        var requestOptions = $.extend(true, {
            type: 'post',
            cache: false,
            dataType: 'json',
            data: {},
            headers: {
                "X-CSRFToken": $.csrftoken
            },
        }, arg || {});
        return $.ajax(requestOptions);
    };

    function summernote_cancel() {
        // summernote 終了処理
        var $description_tabs = $('#tab-descriptions').children('.tab-pane');  // すべてのタブを取得

        $description_tabs.each((index, element) => {
            $(element).children('.summernote-edit-area').summernote('destroy');  // summernote 破棄
        });

        $description_tabs.children('.summernote-edit-area').addClass('d-none');  // summernote 非表示
        $('.wysi-check').addClass('d-none');  // 保存ボタンなど非表示
        $description_tabs.children('.editable-full').removeClass('d-none');  // TextArea 表示
        navtab_hide();
    }

    // 画面描画時の禁止ワードアラートの処理
    $(document).ready(function () {
        const description = String($('.ng-word').data("description")),  // 商品説明文 を取得
            ng_word = $('.ng-word').data("value").split(/\r\n|\n|\r/).reverse();  //禁止ワードを取得

        const ng_word_list = []
        for (let n = 0; n < ng_word.length; n++) {
            if (description.indexOf(ng_word[n]) > -1) {
                ng_word_list.unshift(ng_word[n])
            }
        }
        if (ng_word_list.length === 0 || description === 'None') {
            $('.ng-word').addClass('d-none');
            $('.ng-word-alert').addClass('d-none');
        } else {
            $('.ng-word').removeClass('d-none');
            $('.ng-word-alert').removeClass('d-none');
            $('.ng-word-alert').text(`商品説明に禁止ワードが使われています（「${ng_word_list}」）。`);
        }
    });

    // 商品説明のaタグをクリック時、<br>を改行コードに変換して表示する
    $('#edit-text-mode').on('shown', function (e, editable) {
        const target = e.currentTarget,
            targetText = target.innerText,
            regex = /<br\s*[\/]?>/gi;
        let replaceText = "";
        // 商品説明が「？？？」以外の時に改行コードに変換
        if (targetText !== $.fn.editable.defaults.emptytext) {
            replaceText = targetText.replace(regex, "\n")
        }
        editable.input.$input.val(replaceText);
    });

    $('#summernote-cancel').click(summernote_cancel);  // キャンセルボタン動作
    $('#summernote-save').click(function () {
        // 保存ボタン動作
        let $active = $($('#tab-descriptions').children('.active')[0]),  // active なタブの取得
            markup = $active.children('.summernote-edit-area').summernote('code').replaceAll('&amp;', '&').replaceAll('<div>', '<p>').replaceAll('</div>', '</p>'),  // code を取得
            $active_editable = $active.find('.editable-full a'),  // active タブの x-editable を取得
            ng_word = $('.ng-word').data("value").split(/\r\n|\n|\r/).reverse();  //禁止ワードを取得
        // 商品説明全消去後の保存時にタグが残る仕様の回避
        if (markup == '<br>' || markup == '<div><br></div>' || markup == '<p><br></p>' || markup == '<h4><br></h4>' || markup == '<h5><br></h5>') {
            markup = '';
        }
        var params = {
            pk: $active_editable.data("pk"),
            model: $active_editable.data('model'),
            column: $active_editable.data('column'),
            value: markup.replace(/\r?\n/g, '<br>'),
        };
        var ng_word_list = []
        for (let n = 0; n < ng_word.length; n++) {
            if (markup.indexOf(ng_word[n]) > -1) {
                ng_word_list.unshift(ng_word[n])
            }
        }
        if (ng_word_list.length === 0) {
            $('.ng-word').addClass('d-none');
            $('.ng-word-alert').addClass('d-none');
        } else {
            $('.ng-word').removeClass('d-none');
            $('.ng-word-alert').removeClass('d-none');
            $('.ng-word-alert').text(`商品説明に禁止ワードが使われています（「${ng_word_list}」）。`);
        }
        request({
            type: "POST",
            url: Util.URLS[$active_editable.data('uri') || null] || Util.URLS.PostXeditableData,
            data: params,
        }).done(function (data) {
            const $is_comment = $('.editable-full a').hasClass("editable-open");
            // 値を x-editable 側にセット(コメント編集ありの場合)
            if (!$is_comment) {
                $active_editable.editable("setValue", markup);
            }
            // 値を x-editable 側にセット(コメント編集なしの場合)
            if ($is_comment) {
                $active.find('.editable-full textarea').val(markup);
            }
            summernote_cancel();  // summernote 終了処理
        }).fail(function (err) {
            // TODO エラー処理
        });
        navtab_hide();
    });

    $('#summernote-edit').click(function () {
        // HTML 編集モードに切り替え
        var $description_tabs = $('#tab-descriptions').children('.tab-pane');  // すべてのタブを取得

        $description_tabs.children('.editable-full').addClass('d-none');  // TextArea 非表示
        $description_tabs.children('.summernote-edit-area').removeClass('d-none');  // summernote 表示

        var BoldButton = function (context) {
            var ui = $.summernote.ui;
            var button = ui.button({
                contents: '太字',
                tooltip: '文字を太字に変更',
                click: function () { context.invoke('editor.bold'); }
            });
            return button.render();
        }

        var HightlightButton = function (context) {
            var ui = $.summernote.ui;
            var button = ui.button({
                contents: '赤',
                tooltip: '文字色を赤色に変更',
                click: function () { context.invoke('editor.foreColor', 'red'); }
            });
            return button.render();
        }

        var ClearButton = function (context) {
            var ui = $.summernote.ui;
            var button = ui.button({
                contents: 'クリア',
                tooltip: 'スタイルをクリア',
                click: function () { context.invoke('editor.removeFormat'); }
            });
            return button.render();
        }

        var BodyButton = function (context) {
            var ui = $.summernote.ui;
            var button = ui.button({
                contents: '本文',
                tooltip: '本文',
                click: function () { context.invoke('editor.formatPara'); }
            });
            return button.render();
        }

        var Midashi1Button = function (context) {
            var ui = $.summernote.ui;
            var button = ui.button({
                contents: '大見出し',
                tooltip: '大見出し',
                click: function () { context.invoke('editor.formatH4'); }
            });
            return button.render();
        }

        var Midashi2Button = function (context) {
            var ui = $.summernote.ui;
            var button = ui.button({
                contents: '小見出し',
                tooltip: '小見出し',
                click: function () { context.invoke('editor.formatH5'); }
            });
            return button.render();
        }

        var LinkButton = function (context) {
            console.log(context);
            var ui = $.summernote.ui;
            var button = ui.button({
                contents: '<u>リンク<u/>',
                tooltip: 'リンクを挿入',
                click: function () { context.invoke('linkDialog.show'); }
            });
            return button.render();
        }

        var VideoButton = function (context) {
            console.log(context);
            var ui = $.summernote.ui;
            var button = ui.button({
                contents: '動画',
                tooltip: '動画を挿入',
                click: function () { context.invoke('videoDialog.show'); }
            });
            return button.render();
        }

        $description_tabs.each((index, element) => {
            // summernote 初期化
            $(element).children('.summernote-edit-area').summernote({
                focus: true,
                lang: "ja-JP",
                // 下記ツールバーの設定
                toolbar: [
                    ['style', ['body', 'midashi1', 'midashi2']],
                    ['font', ['mybold', 'color', 'myclear']],
                    ['insert', ['mylink', 'myvideo']],
                ],
                buttons: {
                    mybold: BoldButton,
                    myclear: ClearButton,
                    midashi1: Midashi1Button,
                    midashi2: Midashi2Button,
                    body: BodyButton,
                    mylink: LinkButton,
                    // myvideo: VideoButton,
                },
                // 「現在の色」のデフォルト設定
                colorButton: {
                    foreColor: 'red',
                    backColor: 'transparent'
                },
                // TODO 一行目をタグで括るためにコメント化
                // shortcuts: false
            });

            const $is_comment = $('.editable-full a').hasClass("editable-open")

            // コメント編集ありの場合、textareaから値を取得
            if ($is_comment) {
                $(element).children('.summernote-edit-area').summernote(
                    'code', $(element).find('.editable-full textarea').val());
            }
            // コメント編集なしの場合、aタグから値を取得
            if (!$is_comment) {
                $(element).children('.summernote-edit-area').summernote(
                    'code', $(element).find('.editable-full a').editable("getValue", true));
            }
            navtab_show();
        });

        $('.wysi-check').removeClass('d-none');  // 保存ボタンなど表示
    });

    // active以外の商品説明タブを表示する
    function navtab_show() {
        const $nav_tabs = $(".js-product-comments");
        $nav_tabs.each((index, element) => {
            if (!$(element).hasClass('active')) {
                $(element).hide()
            }
        })
    }

    // active以外の商品説明タブを非表示にする
    function navtab_hide() {
        const $nav_tabs = $(".js-product-comments");
        $nav_tabs.each((index, element) => {
            if (!$(element).hasClass('active')) {
                $(element).show()
            }
        })
    }

    $('#tab-descriptions a.editable-click').on('click', function () {
        navtab_show();
    });

    // テキスト
    function editableText(el) {
        el.editable({
            // 空文字を許可しない
            validate: function (value) {
                if (jQuery.inArray($(this).attr("id"), Requirements) != -1 && $.trim(value) == '') {
                    return '入力必須項目です';
                }
                if ($(this).hasClass('not_permit_empty') && $.trim(value) == '') {
                    return '入力必須項目です';
                }
                if ($(this).data('model') == 'Product') {
                    // 商品名文字数制約
                    if ($(this).data('column') == 'name') {
                        if (value.length > 128) {
                            return '128文字以内で入力してください';
                        }
                    }
                }
                if (($(this).data('model') == 'ProductSKU' && $(this).data('column') == 'proper_price') ||
                    ($(this).data('model') == 'ProductOption' && $(this).data('column') == 'tax_incl_price')) {
                    // 上代、税込み価格制約
                    value = $.trim(value);
                    // 文字種別制約
                    if ($.trim(value) == '') {
                        return '9桁以内で入力して下さい。';
                    }
                    if (!value.match(/^[0-9]*$/)) {
                        return '使用できない文字が含まれています。';
                    }
                    // 文字数制約
                    value = parseInt(value)
                    if (value >= 10 ** 9) {
                        return '9桁以内で入力して下さい。';
                    }
                }
                if ($(this).data('model') == 'ProductSku' && $(this).data('column') == 'jan_code') {
                    // JANコード制約
                    value = $.trim(value);
                    // 文字種別制約
                    if (!value.match(/^[0-9]*$/)) {
                        return '使用できない文字が含まれています。';
                    }
                    // 文字数制約
                    if (value.length != 13) {
                        return '13桁で入力してください';
                    }
                }
                if ($(this).data('model') == 'ProductSkuOption' && $(this).data('column') == 'weight') {

                    value = $.trim(value);
                    // 文字種別制約
                    if (!value.match(/^([1-9]\d*|0)(\.\d+)?$/)) {
                        return '重量は半角数字で入力してください。';
                    }
                }
                if ($(this).data('model') == 'Product' && $(this).data('column') == 'spec_memo') {
                    // 採寸表備考制約
                    value = $.trim(value);
                    // 文字種別制約
                    if (value.length > 1024) {
                        return '1024文字以下で入力してください';
                    }
                }
                if ($(this).attr("id") == "parent_code") {
                    value = $.trim(value);
                    // 文字種別制約
                    if (!value.match(/^[A-Za-z0-9-_]*$/)) {
                        return '指定された形式で入力してください';
                    }

                    // ベース品番設定可能か制約
                    var is_product = false;
                    var msg = '';
                    request({
                        url: Util.URLS.CheckProductCode,
                        data: { "parent_code": value, "pk": $(this).data("pk") },
                        async: false,
                    }).done(function (data) {
                        if (data.success && data.result) {
                            is_product = true;
                        } else if (data.success && !data.result) {
                            msg = data.msg;
                        } else if (!data.success) {
                            msg = '通信エラー';
                        }
                    }).fail(function (err) {
                        msg = '通信エラー';
                    });
                    if (!is_product) {
                        return msg;
                    }
                }
                if ($(this).data('model') == 'ProductColor') {
                    // カラー名文字数制約
                    if ($(this).data('column') == 'name') {
                        if (value.length > 64) {
                            return '64文字以内で入力してください'
                        }
                    }
                    // カラー表示順文字数制約
                    if ($(this).data('column') == 'priority') {
                        n_value = Number(value)
                        if (!value.match(/^[1-9]\d{0,2}$/)) {
                            return '3桁以内の正の整数で入力してください';
                        }
                    }
                    // 素材文字数制約
                    if ($(this).data('column') == 'material' || $(this).data('column') === 'country') {
                        if (value.length > 2048) {
                            return '2048文字以内で入力してください';
                        }
                    }
                    // 洗濯表示文字数制約
                    if ($(this).data('column').startsWith('wash.')) {
                        if (value.length > 128) {
                            return '128文字以内で入力してください';
                        }
                    }
                }
                if ($(this).data('model') == 'ProductSize') {
                    // サイズ名文字数制約
                    if ($(this).data('column') == 'name') {
                        if (value.length > 128) {
                            return '128文字以内で入力してください'
                        }
                    }
                }
                if ($(this).data('model') == 'ProductSkuOption') {
                    if (value.length > 80) {
                        return '80文字以内で入力してください'
                    }
                }
            },
            params: function (params) {
                params.pk = $(this).data("pk");
                params.model = $(this).data("model");
                params.column = $(this).data("column");
                params.uri = $(this).data("uri") || null;
                return params;
            },
            url: function (params) {
                var d = new $.Deferred(),
                    url = Util.URLS[params.uri] || Util.URLS.PostXeditableData;
                request({
                    url: url,
                    type: "POST",
                    dataType: 'json',
                    data: params,
                }).done(function (data) {
                    d.resolve(data);
                }).fail(function (err) {
                    d.reject(err);
                });
                return d.promise();
            },
            ajaxOptions: {
                dataType: 'json',
            },
            success: function (data, config) {
                if ($(this).attr("id") == "parent_code" && data.success) {
                    return { newValue: data.success['value'] }
                } else if ($.inArray($(this).data('model'), ['ProductColor', 'ProductSize']) != -1 && $.inArray($(this).data('column'), ['name', 'priority']) != -1) {
                    $.LoadingOverlay("show");
                    location.reload();
                } else if ($(this).data('model') === 'ProductSKU' && $(this).data('column') === 'proper_price' && data.success) {
                    return { newValue: parseInt(data.success['value']) }
                } else if (!data?.success) {
                    return data?.message
                }
            },
            error: function (response) {
                var msg = '',
                    errors = response.responseJSON;
                console.log(errors)
                if (errors && errors.error) {
                    $.each(errors.error, function (k, v) { msg += k + ": " + v + "<br>"; });
                }
                $('.editable-error-block').addClass('alert-error').html(msg).show();
            }
        });
        $("#tab-descriptions a.editable-click").on('hidden', function () {
            navtab_hide()
        });
    };

    // textarea 用
    function editableTextarea(el) {
        el.editable({
            // 空文字を許可しない
            validate: function (value) {
                const strValue = String(value);
                if (jQuery.inArray($(this).attr("id"), Requirements) != -1 && $.trim(strValue) == '') {
                    return '入力必須項目です';
                }
                if ($(this).data('column') == 'description' || $(this).data('column') == 'house_description' || $(this).data('column') == 'mall_description') {
                    // 商品説明文字数制約
                    if (strValue.length > 4000) {
                        return '4000文字以内で入力してください';
                    }
                }
                if ($(this).data('column') == 'spec_memo' && $(this).data('model') == 'Product') {
                    // 採寸表備考文字数制約
                    if (strValue.length > 4000) {
                        return '4000文字以内で入力してください';
                    }
                }
            },
            display: function (value) {
                const strValue = String(value);
                // 商品説明文の改行コードを<br>に置換
                if ($(this).data('column') == 'description' || $(this).data('column') == 'house_description' || $(this).data('column') == 'mall_description') {
                    if (!strValue) {
                        $(this).text('？？？');
                    }
                    const replaceText = strValue.replace(/\r?\n/g, '<br>')
                    $(this).text(replaceText);
                }
            },
            params: function (params) {
                params.pk = $(this).data("pk");
                params.model = $(this).data("model");
                params.column = $(this).data("column");
                params.uri = $(this).data("uri") || null;
                return params;
            },
            url: function (params) {
                // 商品説明は改行コードを<br>に置換してDBに保存する
                if (params['column'] == "description") {
                    params['value'] = params['value'].replace(/\r?\n/g, '<br>');
                }
                var d = new $.Deferred(),
                    url = Util.URLS[params.uri] || Util.URLS.PostXeditableData;
                request({
                    url: url,
                    type: "POST",
                    dataType: 'json',
                    data: params,
                }).done(function (data) {
                    d.resolve();
                }).fail(function (err) {
                    d.reject(err);
                });
                return d.promise();
            },
            ajaxOptions: {
                dataType: 'json',
            },
            success: function (data, config) {
            },
            error: function (response) {
                var msg = '',
                    errors = response.responseJSON;
                console.log(errors)
                if (errors && errors.error) {
                    $.each(errors.error, function (k, v) { msg += k + ": " + v + "<br>"; });
                }
                $('.editable-error-block').addClass('alert-error').html(msg).show();
            },
            showbuttons: 'bottom'
        });
    };

    var masters = {};
    // セレクタ
    $('.editable-select').editable({
        // type: 'select2',
        // source: Util.URLS.GetJsonMasters,
        source: function () {
            console.log($(this))
            var result = [];
            if ($(this).data('column') == 'system_number') {
                // TODO 奇妙な挙動の調査時間がないため、直打ち
                result = [
                    { 'value': "", 'text': "" },
                    { 'value': "0", 'text': "新規追加" },
                    { 'value': "1", 'text': "カラー追加" },
                    { 'value': "2", 'text': "サイズ追加" },
                    { 'value': "3", 'text': "カラー・サイズ追加" },
                    { 'value': "4", 'text': "作業不要" },
                ]
            } else if ($(this).data('column') == 'sale_type') {
                result = [
                    { 'value': "False", 'text': "通常" },
                    { 'value': "True", 'text': "予約" },
                ]
            } else if ($(this).data('column') == 'weight_unit') {
                result = [
                    "g",
                    "kg",
                    "oz",
                    "lb",
                ]
            } else {
                result = [{ 'value': 0, 'text': '-' }, { 'value': 1, 'text': '○' }, { 'value': 2, 'text': '●' }, { 'value': 3, 'text': '☆' }];
            }
            return result;
        },
        ajaxOptions: {
            dataType: 'json',
            headers: {
                "X-CSRFToken": $.csrftoken
            }
        },
        sourceError: "通信失敗しました",
        params: function (params) {
            params.pk = $(this).data("pk");
            params.model = $(this).data("model");
            params.column = $(this).data("column");
            params.uri = $(this).data("uri") || null;
            return params;
        },
        url: function (params) {
            var d = new $.Deferred(),
                url = Util.URLS[params.uri] || Util.URLS.PostXeditableData;
            request({
                url: url,
                type: "POST",
                dataType: 'json',
                data: params,
            }).done(function (data) {
                d.resolve(data);
            }).fail(function (err) {
                d.reject('error');
            });
            return d.promise();
        },
        success: function (data, Config) {
            // $(this).text(data['success']['value'])

            if ((data.success['model'] == 'ProductColor' || data.success['model'] == 'ProductSize') && data.success['column'] == 'name') {
                // TODO 一旦再読込
                location.reload();
            }

            if (data.success['model'] == 'Product' && (data.success['column'] == 'gender_id' || data.success['column'] == 'category_id')) {
                // TODO 一旦再読込
                location.reload();
            }
        },
        tpl: '<select></select>',
        select2: {
            width: '150px',
            multiple: false,
            tags: true,
            language: 'ja',
            formatSelection: function (item) {
                // キーが文字列の場合
                var text = ''
                if (!parseInt(item)) {
                    var i = 0;
                    $.each(masters.results, function (k, v) {
                        if (v['selected'] !== undefined) {
                            i = k;
                            return true;
                        }
                    });
                    text = masters.results[i].text
                } else {
                    text = masters.results[parseInt(item) - 1].text
                }
                return text;
            },
            id: function (item) {
                console.log(item.id)
                return item.id;
            },
            ajax: {
                type: "GET",
                url: Util.URLS.GetJsonMasters,
                dataType: 'json',
                data: function (d) {
                    // TODO
                    data_info = $(this).closest('span').prev()
                    foreign_model = data_info.data("foreign-model")
                    pk = data_info.data("pk")
                    dest_api = data_info.data('api') ? data_info.data('api') : ''
                    return { 'foreign-model': foreign_model, 'pk': pk, 'dest_api': dest_api }
                },
                processResults: function (data) {
                    masters = data
                    return data;
                }
            },
        },
    });
    // Xeditableイベント削除用
    function destroyXeditable(el) {
        el.editable('destroy')
    }
    // Xeditableイベント再読込用
    function refreshXeditable(el, type = "text") {
        destroyXeditable(el);
        if (type == "text") {
            editableText(el);
        } else if (type == "textarea") {
            editableTextarea(el);
        } else if (type == "select") {
            editableSelect(el);
        }
    }
    editableText($('.editable-text'))
    editableTextarea($('.editable-textarea'))

    // HTMLエスケープ
    var unEscapeHTML = function (str) {
        return str
            .replace(/(&lt;)/g, '<')
            .replace(/(&gt;)/g, '>')
            .replace(/(&quot;)/g, '"')
            //　TODO シングルクォートをダブルクォートにする
            .replace(/(&#39;)/g, '"')
            //.replace(/(&#39;)/g, "'")
            .replace(/(&amp;)/g, '&');
    };

    $('.product-radio').click(function () {
        params = {
            pk: $(this).data('pk'),
            model: $(this).data('model'),
            column: $(this).data('column'),
            value: $(this).val(),
            uri: $(this).data("uri"),
            type: $(this).data("type")
        }
        $(this).closest('.product-radio-group').find('.product-radio').removeClass('active')
        $(this).addClass('active')

        $.LoadingOverlay("show");
        request({
            url: Util.URLS[params.uri],
            type: "POST",
            dataType: 'json',
            data: params,
        }).done(function (data) {
            console.log(data)
        }).fail(function (err) {
            error_alert({ title: '通信エラー', text: `${err.status} ${err.statusText}` });
        }).always(function () {
            $.LoadingOverlay("hide");
        });
    });

    $(".product-select").change(function () {
        params = {
            pk: $(this).data('pk'),
            model: $(this).data('model'),
            column: $(this).data('column'),
            value: $(this).val(),
        }
        request({
            url: Util.URLS.PostXeditableData,
            type: "POST",
            dataType: 'json',
            data: params,
        }).done(function (data) {
            console.log(data)
        }).fail(function (err) {

        })
    });

    function confirmRequest(el, callback_method, titlestr, callback_arg = null) {
        Swal.fire({
            title: titlestr,
            // text: "モールコメントも含めて上書きします",
            type: "warning",
            showCancelButton: true,
            focusCancel: true,
            confirmButtonClass: 'btn btn-danger mx-2',
            cancelButtonClass: 'btn btn-blue mx-2',
            buttonsStyling: false
        }).then(function (isConfirm) {
            if (isConfirm.value) {
                if (!callback_arg) {
                    callback_method(el);
                } else {
                    callback_method(el, callback_arg);
                }
            }
        })
    }

    // 商品説明コピーボタン
    $('#copy-description').click(function () {
        console.log('clicked');
        var $tab_elements = $('#tab-descriptions .tab-pane'),
            $active_tab = $('#tab-descriptions').find('.active'),
            $active_editable = $active_tab.find('.editable-click'),
            active_text = $.trim($active_editable.editable('getValue', true));

        var names = [],
            id_list = [];

        $tab_elements.each((index, element) => {
            if (element.id != $active_tab[0].id) {
                // 上書き対象に対する処理
                var text = $.trim($(`#${element.id} a.editable-click`).editable('getValue', true));  // X-editable の値を取得

                console.log(active_text);
                console.log(text);

                if (text && text.length > 0 && text != active_text) {
                    // 値がある説明一覧を作成
                    names.push($(`a[href='#${element.id}']`)[0].outerText);  // 名前一覧
                    id_list.push(element.id);  // ID 一覧
                } else if (!text || text.length == 0) {
                    // 値がない説明はサイレントで書き換え
                    copyDescription(null, [element.id]);
                }
            }
        });

        if (names.length > 0) {
            confirmRequest(null, copyDescription, `${names.join("・")}を上書きしますか？`, id_list);
        }
    });

    // 商品説明コピー
    var copyDescription = function (el, id_list) {
        var $active_tab = $('#tab-descriptions').find('.active'),
            $active_editable = $active_tab.find('.editable-click'),
            active_text = $.trim($active_editable.editable('getValue', true));

        $.each(id_list, (index, id) => {
            var $to_desc = $(`#${id}`);

            var $to_info = $to_desc.find('a'),
                params = {
                    pk: $to_info.data('pk'),
                    model: $to_info.data('model'),
                    column: $to_info.data('column'),
                    value: active_text,
                };

            request({
                type: "POST",
                url: Util.URLS[$to_info.data("uri")] || Util.URLS.PostXeditableData,
                data: params,
            }).done((data) => {
                // コピー先更新
                $to_info.editable('setValue', active_text);
            }).fail(function (err) {
            });
        });
    };

    var error_alert = function (options, callback) {
        var swal_options = $.extend(true, {
            title: 'エラー',
            text: '',
            type: "error",
        }, options || {});

        Swal.fire(swal_options).then(function (value) {
            if (callback) {
                callback(value);
            }
        });
    }

    var sku_delete = function (el, sku_id) {
        $.LoadingOverlay("show");
        request({
            type: "POST",
            url: Util.URLS.DeleteSku,
            data: { 'pk': sku_id },
        }).done(function (data) {
            if (data.success) {
                console.log(el);
                // 連携ステータスの削除
                el.closest('tr').next('tr').remove();
                // SKU情報の削除
                el.closest('tr').remove();
            } else {
                error_alert({ text: '削除に失敗しました。' });
            }
        }).fail(function (e) {
            error_alert({ title: '通信エラー', text: `${e.status} ${e.statusText}` });
        }).always(function () {
            $.LoadingOverlay("hide");
        });
    };

    //SKU追加
    $.csrftoken = $.getCookie('csrftoken');
    $('.product-sku-create').click(function () {
        var brand_code = $(this).data('brand_code');
        var product_code = $(this).data('product_code');
        if ($('#color_code').val() && $('#size_code').val()) {
            var color_code = $('#color_code').val();
            var size_code = $('#size_code').val();
        }
        else return
        var from_core = $(this).data('from_core');
        var jan_code = document.getElementById("jan").value;
        $.LoadingOverlay('show');
        $.ajax({
            url: Util.URLS.CreateSku,
            type: 'POST',
            data: {
                'brand_code': brand_code,
                'product_code': product_code,
                'color_code': color_code,
                'size_code': size_code,
                'jan_code': jan_code,
                'from_core': from_core,
            },
            headers: {
                "X-CSRFToken": $.csrftoken
            },
        }).done(function () {
            Swal.fire({
                title: "SKUの登録が完了しました。",
                text: "",
                type: "success",
                showConfirmButton: true,
                confirmButtonText: "閉じる",
            });
            location.reload();
        }).fail(function (xhr) {
            var res = {}
            try {
                res = $.parseJSON(xhr.responseText);
            } catch (e) {
            }
            Swal.fire({
                title: "エラー",
                text: res.message,
                type: "error",
                showConfirmButton: true,
                confirmButtonText: "閉じる",
            });
        }).always(() => {
            $.LoadingOverlay('hide');
        });
    })
    //カラー・サイズセレクト２
    $('#color_code').select2({
        width: '100%',
    });
    $('#size_code').select2({
        width: '100%',
    });
    //エラーメッセージ
    $('.jan-error').keyup(function () {
        var jan_code = document.getElementById("jan").value;
        if (jan_code) {
            if (jan_code !== undefined && jan_code !== null && jan_code.length >= 1) {
                if (!jan_code.match(/^[0-9]+$/g) || (jan_code.length !== 13)) {
                    $('p3').text('半角数字13桁で入力してください。');
                } else if (jan_code.length == 13) {
                    $('p3').text('');
                }
            }
        }
        else {
            $('p1').text('');
        }
    })
    error = 'このフィールドは入力必須です。'
    function color_valid() {
        var color_code = $('#color_code').val();
        if (color_code) {
            $('p1').text('');
        }
        else {
            $('p1').text(error);
        }
    }
    function size_valid() {
        var size_code = $('#size_code').val();
        if (size_code) {
            $('p2').text('');
        }
        else {
            $('p2').text(error);
        }
    }
    $('.color-size-error').click(color_valid)
    $('.color-size-error').click(size_valid)
    $('#color_code').change('select2:select', color_valid)
    $('#size_code').change('select2:select', size_valid)

    // 画像拡大表示
    $('#main-image').xzoom();
    // $('#main-image').okzoom({
    //     width: 250,  // ルーペの幅
    //     height:250,  // ルーペの高さ
    //     round:true,  // ルーペの形
    //     border: "1px solid black", // ルーペのボーダー指定
    //     shadow: "0 0 5px #ffffff"  // ルーペの影指定
    // });

    // SKU削除
    $('.product-sku-delete').click(function () {
        $.LoadingOverlay("show");
        var $el = $(this);
        var sku_id = $(this).attr('id');
        request({
            type: "GET",
            url: Util.URLS.DeleteSku,
            data: { 'pk': sku_id },
        }).done(function (data) {
            confirmRequest($el, sku_delete, `${(data.is_linked) ? '連携実績のある' : ''}SKUを削除します\nよろしいですか？`, sku_id);
        }).fail(function (e) {
            error_alert({ title: '通信エラー', text: `${e.status} ${e.statusText}` });
        }).always(function () {
            $.LoadingOverlay("hide");
        });
    })

    // JANコード、SKUコードが編集開始された時に確認ダイアログを表示
    function confirm_editing(e) {
        const el = e.currentTarget;
        // dataset jqueryオブジェクトから参照するとキャッシュから取得して不整合おきることがあるのでvanillaで書いてます
        const isClicked = el.dataset.isClicked;
        if (!isClicked) {
            $(el).editable('toggleDisabled');
            Swal.fire({
                title: "この値を変更すると外部サービスとの連携に不具合が生じる可能性があります\nよろしいですか？",
                type: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'OK'
            }).then((result) => {
                if (result.value) {
                    $(el).editable('toggleDisabled');
                    $(el).editable('option', 'onblur', 'ignore');
                    el.dataset.isClicked = true;
                    $(el).trigger("click");
                } else {
                    $(this).editable('toggleDisabled');
                }
            })
        }
        else {
            el.dataset.isClicked = ""
        }
    }
    $('a[data-column="jan_code"]').on('click', confirm_editing);
    $('a[data-column="sku_code"]').on('click', confirm_editing);

    // 品番タブ
    $('.product-tab').click(function () {
        if (!$('#mall-status-tab').hasClass('active')) {
            var change_tab_id = $(this).attr('id')
            $('.product-row').addClass('d-none')
            $('.' + change_tab_id).removeClass('d-none')
        }
    });

    // 連携ステータスタブ
    $('#mall-status-tab').click(function () {
        var product_code = $.trim($('.product-tab.active').text());
        if ($(this).hasClass('active')) {
            $('#product-sku-info').removeClass('d-none')
            $('#product-mall-status').addClass('d-none')
            $(this).removeClass('active')

            $('.mall-status-' + product_code).addClass('d-none');
            $('.tab-' + product_code).removeClass('d-none');
            $("#mall-status-annotation").addClass("d-none");
        } else {
            $('#product-sku-info').addClass('d-none')
            $('#product-mall-status').removeClass('d-none')
            $(this).addClass('active')

            $('.mall-status-' + product_code).removeClass('d-none');
            $('.tab-' + product_code).addClass('d-none');
            $("#mall-status-annotation").removeClass('d-none')
        }
    });

    // 連携ステータスアクティブ状態の品番タブ
    $('.product-tab').on('shown.bs.tab', function (e) {
        if ($('#mall-status-tab').hasClass('active')) {
            $('.' + e.target.id).addClass('d-none')
            $('.mall-status-' + $.trim(e.target.text)).removeClass('d-none');
            $('.mall-status-' + $.trim(e.relatedTarget.text)).addClass('d-none')
        }
    })

    // 洗濯表示のマスタ
    var init_wash_master = function () {
        request({
            url: Util.URLS.GetJsonMasters,
            type: "GET",
            data: { "foreign-model": "wash", "dest_api": "Central" }
        }).done(function (washing_master) {
            var wash_hash = {};
            $.map(washing_master.results, function (i, j) {
                var wash_type = i['code'].slice(0, 1);
                if (typeof wash_hash[wash_type] == "undefined") wash_hash[wash_type] = [];
                wash_hash[wash_type].push('<i id="' + i['code'] + '" class="col text-center wash_icon sa sa-4x sa-' + i['code'] + '"></i>');
            });
            // TODO
            $.map(wash_hash, function (i, j) {
                var w = ['<div id="" class="col text-center wash_icon">未設定</div>'].concat(i).join('')
                $('.wash-type-' + j).popover({
                    placement: 'top',
                    trigger: 'focus',
                    container: 'body',
                    template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="row justify-content-center align-items-center">' + w + '</div><div class="popover-body"></div></div>'
                });
            })
        });
    };
    init_wash_master()
    // 洗濯表示選択
    $(document).on("inserted.bs.popover", ".sentaku", function () {
        // $('.sentaku').on('inserted.bs.popover', function () {
        var self = $(this)
        console.log(self)
        $('.wash_icon').off('selectstart');
        $('.wash_icon').on('selectstart', function () {
            var wash_code = $(this).attr('id'),
                params = {
                    'model': self.data('model'),
                    'column': self.data('column'),
                    'pk': self.data('pk'),
                    'value': wash_code
                }
            request({
                url: Util.URLS.UpdateWash,
                data: params,
                dataType: 'json'
            }).done(function (response) {
                if (response?.success) {
                    self.empty();
                    if (wash_code && wash_code.length > 0) {
                        self.append('<i class="sa sa-3x sa-' + wash_code + '"></i>');
                    }
                    else {
                        self.append('<div class="d-flex align-items-center" style="height: 51px;width: 51.66px;"><span>未設定</span></div>');
                    }
                }
                else {
                    Swal.fire(
                        title = 'エラー',
                        text = '編集できません',
                        type = 'error',
                    );
                }
            }).fail(function (err) {
            });
        });
    });

    // 洗濯表示行追加
    $('.wash_add').click(function () {
        // 5こまで
        var self = $(this),
            wash_row = self.closest('.product-colors').find('.wash-rows'),
            color_id = wash_row.data('color-id'),
            product_id = wash_row.data('product-id'),
            wash_last_row = wash_row.last();

        $.LoadingOverlay("show", { background: "rgba(0, 0, 0, 0.4)" });

        console.log(wash_row.children().length)
        if (wash_row.children().length >= 5) {
            $.LoadingOverlay("hide");
            Swal.fire("5つまで登録可能です。", "", "error")
            return false;
        }
        // 洗濯表示一行追加したhtmlを取得
        request({
            url: Util.URLS.UpdateOrCreateWashRow,
            type: 'GET',
            dataType: 'html',
            data: { 'product_id': product_id, 'product_color_id': color_id }
        }).done(function (data) {
            wash_row.empty()
            wash_row.append($(data).find(".wash-rows." + color_id).children())
            init_wash_master()
            refreshXeditable($('.editable-text'))
            $.LoadingOverlay("hide");
        }).fail(function (data) {
            console.log(data.responseText)
            $.LoadingOverlay("hide");
        })
    });

    // 洗濯表示行クリア
    $(document).on("click", ".wash-row-delete", function () {
        // $('.wash-row-delete').click(function(){
        var self = $(this),
            index = self.data('cnt'),
            wash_row = self.closest('.product-colors').find('.wash-rows'),
            color_id = wash_row.data('color-id'),
            product_id = wash_row.data('product-id');

        $.LoadingOverlay("show", { background: "rgba(0, 0, 0, 0.4)" });

        // 洗濯表示一行削除したhtmlを取得
        request({
            url: Util.URLS.UpdateOrCreateWashRow,
            type: 'GET',
            dataType: 'html',
            data: { 'product_id': product_id, 'product_color_id': color_id, 'is_delete': 1, 'wash_index': index }
        }).done(function (data) {
            wash_row.empty()
            wash_row.append($(data).find(".wash-rows." + color_id).children())
            init_wash_master()
            refreshXeditable($('.editable-text'))
            $.LoadingOverlay("hide");
        }).fail(function (data) {
            console.log(data.responseText)
            $.LoadingOverlay("hide");
        })
    })

    jsGrid.validators.spec = {
        message: "",
        validator: function (value, item, param) {
            if (item.validatedConfirm) {
                return true;
            }
            var $prev = $('.jsgrid-edit-row').prev('tr'),
                $next = $('.jsgrid-edit-row').next('tr').next('tr'),
                prev = undefined,
                next = undefined;
            if ($prev.data('JSGridItem') !== undefined) {
                prev = $prev.data('JSGridItem')[param];
            }
            if ($next.data('JSGridItem') !== undefined) {
                next = $next.data('JSGridItem')[param];
            }
            if ((prev !== undefined && isNaN(parseInt(prev))) || (next !== undefined && isNaN(parseInt(next))) || isNaN(parseInt(value))) {
                // prev/next/value が数値でないとき、逆転判定せずに次へ
                return true
            }
            if ((prev === undefined || parseInt(prev) <= parseInt(value)) && (next === undefined || parseInt(next) >= parseInt(value))) {
                return true;
            }
            return false;
        }
    }

    // 採寸ヘッダ
    // JsGrid用フォーマット
    var get_js_grid_fmt_spec = function (spec_headers) {
        var fields = [
            { title: "サイズ", name: "name", type: "text", width: 120, align: "center", editing: false },
        ];

        if (spec_headers.length != undefined) {
            for (let i = 0; i < spec_headers.length; i++) {
                fields.push({
                    title: spec_headers[i], name: "spec-" + i, type: "text", width: 120, align: "center",
                    validate: [
                        {
                            validator: "required", message: function (value, item) {
                                return '値が未入力です。';
                            },
                        },
                        {
                            validator: "rangeLength", param: [0, 32], message: function (value, item) {
                                return '32文字以内で入力してください。';
                            },
                        },
                        {
                            validator: "spec", param: `spec-${i}`, message: function (value, item) {
                                return '値が逆転しています。';
                            },
                        },
                    ]
                })
            }
        }
        fields.push(
            { title: "優先順", name: "priority", type: "number", width: 120, align: "center", editing: false },
        );

        return fields;
    };

    // 採寸値
    var product_size_specs = $('#size_specs').data('spec')
    spec_headers = $('#size_specs').data('header').length > 0 ? $('#size_specs').data('header') : [];
    var fields = get_js_grid_fmt_spec(spec_headers);

    const spec_order_check = function ($row, $next, param) {
        let val = undefined, next_val = undefined;
        if ($row.data('JSGridItem') !== undefined) {
            val = $row.data('JSGridItem')[param];
        }
        if ($next.data('JSGridItem') !== undefined) {
            next_val = $next.data('JSGridItem')[param];
        }
        if (isNaN(parseInt(next_val)) || isNaN(parseInt(val))) {
            // val/next_val が数値でないとき、逆転判定せずに次へ
            return true
        }
        if (parseInt(next_val) >= parseInt(val)) {
            return true;
        }
        return false;
    }

    // js-grid
    function jsgridtest(fields) {
        // TODO https://github.com/tabalinas/jsgrid/blob/master/src/i18n/ja.js を有効化する
        jsGrid.locales.ja = {
            grid: {
                noDataContent: "データが見つかりません。",
                deleteConfirm: "削除しますがよろしいですか？",
                pagerFormat: "頁: {first} {prev} {pages} {next} {last} &nbsp;&nbsp; 【{pageIndex}／{pageCount}】",
                pagePrevText: "前",
                pageNextText: "次",
                pageFirstText: "最初",
                pageLastText: "最後",
                loadMessage: "しばらくお待ちください…",
                invalidMessage: "入力されたデータが不正です。"
            },
        };
        jsGrid.locale("ja");
        $("#jsGrid").jsGrid({
            height: "auto",//"70%",
            width: "100%",
            autoload: false,
            editing: false,
            data: product_size_specs,//[{'productsize_id': 1, 'name': 'F', 'priority': 128}],
            filtering: false,
            paging: false,
            rowClass: function (item, itemIndex) {
                return "spec-" + itemIndex;
            },
            fields: fields,
            onRefreshed: function () {
                var $gridData = $("#jsGrid .jsgrid-grid-body tbody");
                $gridData.sortable({
                    update: function (e, ui) {
                        const classes = $gridData.sortable("toArray", { attribute: "class" }).filter(function (value) {
                            // spec-x クラスを含むものに絞り込む
                            return value.includes('spec-');
                        }).map(function (value) {
                            // spec-x クラスを取得
                            return value.split(' ').filter(function (value) {
                                return value.includes('spec-')
                            })[0];
                        });

                        const validate = []
                        classes.forEach(function (value, index) {
                            if (classes.length - 2 >= index) {
                                // 各行を順に舐める
                                const $row = $gridData.find(`.${value}`);
                                const $next = $gridData.find(`.${classes[index + 1]}`);
                                spec_headers.forEach(function (name, i) {
                                    // 項目ごとにチェック
                                    if (!spec_order_check($row, $next, `spec-${i}`)) {
                                        validate.push({ field: name });
                                    }
                                })
                            }
                            return true;
                        });

                        const update_spec_table = function () {
                            const items = classes.map(function (value) {
                                return $gridData.find(`.${value}`).data("JSGridItem")["productsize_id"];
                            })

                            request({
                                type: "POST",
                                url: Util.URLS.UpdatePriority,
                                contentType: 'application/json',
                                data: JSON.stringify({
                                    'model': $("#jsGrid").data('model'),
                                    'product_id': $("#jsGrid").data('product-id'),
                                    'order': items,
                                }),
                            }).done(function (data) {
                                // TODO ERROR 表示
                                console.log(data)
                                if (data['success']) {
                                    const items = classes.map(function (value) {
                                        const $row = $gridData.find(`.${value}`);
                                        // 採寸テーブル更新
                                        const row_data = $row.data("JSGridItem");
                                        console.log('before', row_data);
                                        row_data['priority'] = data['results'][row_data['productsize_id']];
                                        console.log('after', row_data);
                                        $row.data("JSGridItem", row_data);

                                        // 検印表示順更新
                                        const $stamp = $(`.enable_stamp[data-model=ProductSize][data-pk=${row_data['productsize_id']}][data-column=specs]`);
                                        if ($stamp.length) {
                                            console.log($stamp, data['results'][row_data['productsize_id']]);
                                            $stamp.css('order', data['results'][row_data['productsize_id']]);
                                        }
                                        return row_data;
                                    });
                                    $("#jsGrid").jsGrid("sort", { field: "priority", order: "asc" });
                                }
                            }).fail(function () {
                                Swal.fire({
                                    title: 'エラー',
                                    text: '再度実行してください。',
                                    type: "error",
                                    onClose: () => {
                                        location.reload();
                                    }
                                });
                            });
                        }

                        if (validate.length > 0) {
                            Swal.fire({
                                title: '並び順を変更しますか？',
                                html: '採寸表が昇順ではなくなります。',
                                type: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#3085d6',
                                cancelButtonColor: '#d33',
                                confirmButtonText: 'OK'
                            }).then((result) => {
                                if (result.value) {
                                    update_spec_table();
                                } else {
                                    $gridData.sortable('cancel');
                                    return;
                                }
                            })
                        } else {
                            update_spec_table();
                        }
                    },
                });
            },
            // onItemEditing: function (args) {
            //     console.log('onItemEditing called!!!!')
            //     $("#jsGrid .jsgrid-grid-body tbody").sortable('disable');
            // },
            // JsGrid v1.5.3 には onItemEditCancelling がないので保留
            // onItemEditCancelling: function (args) {
            //     console.log('onItemEditCancelling called!!!!')
            //     $("#jsGrid .jsgrid-grid-body tbody").sortable('enable');
            // },
        });
        $("#jsGrid").jsGrid("sort", { field: "priority", order: "asc" });
    }
    jsgridtest(fields);

    // 採寸モーダル更新処理
    $(document).on('click', '#specs-save', function () {
        const validateSpecValue = () => {
            const errorMessageList = [];
            specValues.forEach((spec, i) => {
                const headerLen = specHeaders.length
                // 採寸値は{サイズID,サイズ名称,優先順}からなるディクトが予め入っているため、要素数からその分を引きます
                const specsLen = spec.length - 1
                if ((headerLen > specsLen) && (specsLen != 0)) {
                    errorMessageList.push(`[${i + 1}行目]ヘッダ分入力してください<br>`);
                } else if ((headerLen < specsLen) && (specsLen != 0)) {
                    errorMessageList.push(`[${i + 1}行目]ヘッダがありません<br>`);
                }
                spec.forEach((spec, cellIndex) => {
                    if (typeof (spec) == 'string' && spec.length >= 33) {
                        errorMessageList.push(`[${i + 1}行目][${cellIndex + 1}列目]の文字が32字を超えています<br>`);
                    }
                })
            });
            return errorMessageList;
        }
        // 同じ列について、サイズが降順になっていないか確認する
        const validateSize = () => {
            let warningMessages = [];
            for (var i = 0; i < specValues.length - 1; i++) {
                for (var j = 0; j < specValues[0].length; j++) {
                    let prev = specValues[i][j],
                        next = specValues[i + 1][j]
                    if ((typeof (prev) != 'object') || ((typeof (next) != 'object'))) {
                        if ((prev != '') && (next != '')) {
                            if (Number(prev) > Number(next)) {
                                warningMessages.push(`[${specHeaders[j - 1]}][${i + 1}行目][${j + 1}列目]の値が逆転しています<br>`);
                                // break
                            }
                        }
                    }
                }
            }
            return warningMessages
        }
        const postSpecs = () => {
            $.LoadingOverlay('show');
            const data = {
                'product_id': $('#productSpecs').data('product-id'),
                'spec_headers': specHeaders,
                'specs': specValues
            }
            request({
                type: "POST",
                url: Util.URLS.PostSpecs,
                data: data,
            }).done(function (response) {
                const isOk = response['success']
                if (isOk) {
                    $.LoadingOverlay('show');
                    location.reload()
                }
            }).always(function () {
                $.LoadingOverlay('hide');
            }).fail(function (e) {
                $.LoadingOverlay('hide');
                const res = e.responseJSON;
                Swal.fire({
                    title: "採寸情報の保存に失敗しました",
                    text: res.error,
                    type: "error",
                    showConfirmButton: true,
                });
            });
        }
        // ワーニングの確認モーダルを出す
        const confirmWarnings = (warningMessages) => {
            if (warningMessages.length == 0) {
                postSpecs(specHeaders, specValues)
            } else {
                $.LoadingOverlay('hide');
                Swal.fire({
                    title: "上書きしますか？",
                    html: warningMessages.join(''),
                    type: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'OK'
                }).then((result) => {
                    if (result.value) {
                        postSpecs(specHeaders, specValues)
                    } else {
                        return false
                    }
                })
            }
        }
        // ワーニングがあるか確認(ZOZOバリデートあり)
        const validateAsync = () => {
            $.ajax({
                type: 'GET',
                url: Util.URLS.GetJsonMasters,
                data: {
                    'dest_api': 'Central',
                    'foreign-model': 'zozo_spec_master'
                },
            }).done(function (res) {
                warningMessages = validateSize()
                for (const header of specHeaders) {
                    var master = res['results'].indexOf(header);
                    if (master == -1) {
                        warningMessages.push(`[${header}]はZOZOマスターに存在しない項目です。<br>`)
                    }
                }
                confirmWarnings(warningMessages)
            }).fail(function (textStatus, errorThrown) {
                Swal.fire({
                    title: "ZOZOマスターの取得に失敗しました",
                    type: "error",
                    showConfirmButton: true,
                });
            });
        }
        // エントリー
        $.LoadingOverlay('show');
        let preSpecHeaders = []
        $('.spec-header-inner > input').each((header_index, element) => {
            preSpecHeaders.push($(element).val());
        });
        // 空文字列を除去します
        let specHeaders = preSpecHeaders.filter(n => n);

        /* specValues:下記のようなデータが最終的に入っています
            [
                [{productsize_id: 1, name: S, priority 1}, 100,110,120],
                [{productsize_id: 2, name: M, priority 2}, 110,120,130],
            ]
        */
        let specValues = [];
        $('.specs-table-row > tbody > tr').each((row_index, element) => {
            const specsRow = [];
            const productsize_id = $(element).data('productsize-id'),
                productsize_name = $(element).data('productsize-name'),
                priority = $(element).data('priority')
            specsRow.push({
                'productsize_id': productsize_id,
                'name': productsize_name,
                'priority': priority
            });
            $(element).find('td.specs-td > input').each((cell_index, element) => {
                specsRow.push($(element).val());
            });
            // 空文字列を除去します
            const specsFilterRow = specsRow.filter(n => n);
            specValues.push(specsFilterRow);
        });
        const errorMessages = validateSpecValue()
        if (errorMessages.length > 0) {
            $.LoadingOverlay('hide');
            Swal.fire({
                title: '入力内容に誤りがあります',
                html: errorMessages.join(''),
                type: 'error'
            });
            return;
        }
        // zozoとモール連携しているか？
        if (Boolean($('#specs-save').data('is_zozo_contained'))) {
            validateAsync();
        } else {
            const warningMessages = validateSize()
            confirmWarnings(warningMessages)
        }
    })

    $(function () {
        $("#CardBoxes").sortable({
            'cursor': 'pointer',
            'handle': '.color-handle',
            update: function (e, ui) {
                var items = $.map($("#CardBoxes").find(".card-box"), function (row) {
                    return $(row).data("pk");
                });
                request({
                    type: "POST",
                    url: Util.URLS.UpdatePriority,
                    contentType: 'application/json',
                    data: JSON.stringify({
                        'model': $(this).data('model'),
                        'product_id': $(this).data('product-id'),
                        'order': items,
                    }),
                }).done(function (data) {
                    $.map($("#CardBoxes").find("a[data-column='priority']"), function (row) {
                        $(row).text(data['results'][$(row).data("pk")]);
                        return $(row);
                    });
                });
            }
        });
    });

    // 画像切り替え
    $(".product-image").click(function () {
        // 画像
        var main_image = $('#main-image'),
            src = $(this).children('img').attr('src'),
            color = $(this).children('img').data('color-name');
        main_image.attr('src', src);
        main_image.attr('xoriginal', src);
        // カラー名
        color = (color !== 'None') ? color : '未設定'
        $('#product-image-main-name').text(color)
    });

    // 項目編集可不可リクエスト
    $('.enable_column_lock').columnLock();

    // 項目チェックリクエスト
    $('.enable_stamp').productStamp();

    const uncheck_stamp = function (event) {
        event.preventDefault();
        check_clicked = this;
        Swal.fire({
            title: event.data.title,
            html: `一度つけた${event.data.title}を外しますか？`,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: '外す'
        }).then((result) => {
            if (result.value) {
                $.LoadingOverlay("show", {
                    background: "rgba(0, 0, 0, 0.4)"
                });
                var params = {
                    model: "ProductSku",
                    value: 0,
                    pk: $(this).data("pk"),
                    column: event.data.update_column,
                    mode: 'normal',
                };
                $.request({
                    url: Util.URLS.SaveStamp,
                    data: params,
                }).done(function (data) {
                    if (data.success) {
                        // data.results は１つしか返却されない想定
                        item = data.results[0];
                        if (item.value == false) {
                            event.data.refresh_check_mark()
                        } else {
                            Swal.fire({ title: "検印を外せませんでした", html: item.reason, type: "warning" });
                            $.LoadingOverlay("hide");
                            location.reload();
                        }
                    } else {
                        Swal.fire({
                            title: "エラー", text: data.reason, type: "error", onClose: () => {
                                location.reload();
                                $.LoadingOverlay("hide");
                            }
                        });
                    }
                }).fail(function (e) {
                    Swal.fire({
                        title: "通信エラー", text: `${e.status}: ${e.statusText}`, type: "error", onClose: () => {
                            location.reload();
                            $.LoadingOverlay("hide");
                        }
                    });
                });
            }
        });
    }

    // クライアント検印取り外しモードに
    $('.client_final_check_icon_per_sku').click({
        title: '最終チェック',
        check_type: 'client_final_check',
        update_column: "client_final",
        refresh_check_mark: function () {
            $(check_clicked).addClass('d-none');
            sku_checkbox = $(check_clicked).parent().find('.client_final_check_box');
            sku_checkbox.data('original', 0);
            sku_checkbox.removeClass('d-none');
            $.LoadingOverlay("hide");
        }
    }, uncheck_stamp);

    // スタジオ検印取り消し
    $('[class*=sku-studio-check-]').click({
        title: 'スタジオ最終検印',
        check_type: 'sku-studio-check',
        update_column: "studio_final",
        refresh_check_mark: function () {
            $(check_clicked).addClass('d-none');
            sku_checkbox = $(check_clicked).parent().find('.studio_final_check_box');
            sku_checkbox.data('original', 0);
            sku_checkbox.removeClass('d-none');
            $.LoadingOverlay("hide");
        }
    }, uncheck_stamp)

    const check_at_once = function (event) {
        const is_checked = $(this).prop('checked');
        event.data.check_boxes.each(function () {
            if (!$(this).hasClass('d-none')) { //編集モードにあるチェックボックスのみ値を変更
                $(this).prop('checked', is_checked);
            }
        });
    }

    //スタジオ検印最終チェック、一括チェックボックス
    $('#stdio_final_checkbox_at_once').change(
        { check_boxes: $('.studio_final_check_box') },
        check_at_once
    );

    //最終チェック、一括チェックボックス
    $('#client_final_checkbox_at_once').change(
        { check_boxes: $('.client_final_check_box') },
        check_at_once
    );

    // 一括検印 (スタジオ最終検印・最終チェック)
    $('[data-type=sku-studio-check]').each(function (i, el) {
        var $el = $(el);
        $.subscribe(`product_stamp.ProductSku.${$el.data('pk')}.studio_final`, function (data, value) {
            if (value === true) {
                $el.removeClass('d-none');
            } else if (value === false) {
                $el.addClass('d-none');
            }
        });
    });

    // 商品説明 フェードアウト処理用
    $('#tab-descriptions').hover(
        function () {
            $(this).find('.description_bg').addClass('d-none');
        },
        function () {
            if (!$('#tab-descriptions a').hasClass('editable-open')) {
                $(this).find('.description_bg').removeClass('d-none');
            }
        }
    );

    // 商品説明タブ切り替え
    $('#tab-descriptions a').on('shown', function (e, editable) {
        editable.$element.prev().addClass('d-none');
        editable.$element.parent().css('maxHeight', 'initial');
        editable.$element.parent().css('maxHeight', 'auto');
    });
    $('#tab-descriptions a').on('hidden', function (e, reason) {
        $(this).closest('div').find('.description_bg').removeClass('d-none');
        $(this).closest('div').css('maxHeight', '');
    });

    // メーカカテゴリ表示調整
    $('.maker-category a').on('shown', function (e, editable) {
        editable.$element.parent().addClass('flex-grow-1');
    });
    $('.maker-category a').on('hidden', function (e, reason) {
        $(this).closest('div').removeClass('flex-grow-1');
    });

    $('ul.navtab li.nav-item a').on('dblclick', function (e) {
        if (e.ctrlKey || e.metaKey) {
            // コピーするテキストの取得
            const text = $.trim($(this).text());
            navigator.clipboard.writeText(text)
            Swal.fire({
                title: "コピーしました",
                type: 'success',
                toast: true,
                showConfirmButton: false,
                timer: 1000,
            });
        }
    });

    //タブ切り替え時アイコン表示
    $(".loading").click(function (e) {
        if (e.ctrlKey == false) {
            $.LoadingOverlay("show", {
                background: "rgba(0, 0, 0, 0.4)"
            })
        }
    });

    $('#CommonModal').on('show.bs.modal', function (e) {
        $('#CommonModal .title').text('');
        $("#CommonModalBody").html("")
    });
    $('#CommonModal').on('hide.bs.modal', function (e) {
        $('#CommonModal .title').text('');
        $("#CommonModalBody").html("")
    });

    $('#ProductSkuTableJanCodeColumnHeader').on('dblclick', function (e) {
        if (!e.ctrlKey && !e.metaKey) {
            return;
        }
        $('#CommonModal').modal({});
        const $modal_body = $('#CommonModalBody');
        $('#CommonModal .title').text('JANコードリスト');
        $modal_body.html('<table class="table"><thead class="thead-dark"></thead><tbody></tbody></table>');
        console.log($modal_body);
        $modal_body.find('thead').html('<tr><th scope="col">カラー名</th><th scope="col">サイズ名</th><th scope="col">JANコード</th></tr>');
        const $tbody = $modal_body.find('tbody');
        const rows = $.map($('.product-row:not(.d-none)'), sku => {
            const color_name = $(sku).find('[data-model=ProductColor][data-column=name]').editable('getValue', true);
            const size_name = $(sku).find('[data-model=ProductSize][data-column=name]').editable('getValue', true);
            const jan_code = $(sku).find('[data-column=jan_code]').editable('getValue', true);
            const jan_code_img = jan_code ? `<img src="/product/barcode/?jan_code=${jan_code}"/>` : '';
            return `<tr><td>${color_name}</td><td>${size_name}</td><td>${jan_code_img}</td></tr>`
        });
        $tbody.html(rows);

    });

    // 関連商品の検索
    $("#relation_product_search").click(function () {
        // ブランド・ベース品番・カテゴリを取得
        var brand_id = $("#modal_brand_select").val();
        var product_code = $("#modal_code").val();
        var category_id = $("#modal_category_select").val();
        var product_id = $("#modal_base_product_id").val();
        var product_name = $("#modal_product_name").val();
        var save_form = $("#reation_product_save_form").serializeArray();
        var relation_product = []
        for (i in save_form) {
            if (save_form[i]['name'] == "relation_product_id") {
                relation_product.push(save_form[i]['value'])
            }
        }
        relation_product = relation_product.join('/')

        // 何も入力されていない状態で検索ボタン押下時のバリデーション書く
        $.LoadingOverlay("show");
        request({
            url: "/product/detail/get_relation_product",
            type: "POST",
            data: {
                brand_id: brand_id,
                product_code: product_code,
                category_id: category_id,
                product_id: product_id,
                product_name: product_name,
                relation_product: relation_product,
            },
            scriptCharset: "utf-8",
        })
            .done(function (data) {
                rows = "";
                options = $.map(data[0], function (d, index) {
                    if (d.product_name.length > 20) {
                        d.product_name = d.product_name.substr(0, 20) + "...";
                    };
                    rows += "<tr>";
                    rows +=
                        "<input type='hidden' name='relation_product_id' value=" +
                        "'" +
                        d.product_id +
                        "'" +
                        ">";
                    rows +=
                        "<td><img src=" +
                        "'" +
                        d.image.url +
                        "'" +
                        "class='relation_thumbnail' /></td>";
                    rows += "<td>" + d.brand_name + "</td>";
                    rows += "<td>" + d.product_code + "</td>";
                    rows += "<td>" + d.category_name + "</td>";
                    rows += "<td>" + d.product_name + "</td>";
                    rows += '<td><button type="button" class="btn btn-danger btn-xs mt-1 float-right relation_product_delete text-nowrap">削除</button></td>';
                    rows += "</tr>";
                    return rows;
                });
                rows += '<tr class="sort-disabled back-tr h-100" id="bg-color-gray"><td colspan="6">ドラッグ&ドロップで設定可能です</td></tr>'
                // テーブルに作成したhtmlを追加する
                $("#search_product tr").not('.front-tr').remove();
                $("#search_product").append(rows);
            })
            .fail(function (err) {
                console.log(err);
            })
            .always(function () {
                $.LoadingOverlay("hide");
            })
    });

    // 関連商品モーダル内リセットボタン押下時
    // 検索ワードの初期化と検索結果の削除
    $(".modal_relation_product_reset").click(function () {
        $("#modal_brand_select").val(null).trigger("change");
        $("#modal_code").val("");
        $("#modal_product_name").val("");
        $("#modal_category_select").val(null).trigger("change");
        $("#search_product tr").not(".front-tr,.back-tr").remove();
    });

    // 関連商品削除ボタン
    $(".save_product_body").on('click', '.relation_product_delete', function () {
        $(this).parent().parent().remove();
    });

    // カテゴリ検索プルダウン
    $("#open_relation_product").on('click', function () {
        $("#modal_category_select").children().remove();
        // 選択されたブランドに応じてカテゴリを返す
        // TODO : 非同期で取得する
        var url = "/master/api/categorys/";
        fetch(url)
            .then(function (data) {
                return data.json();
            }).then(function (data) {
                options = $.map(data, function (d) {
                    option = $("<option>", { value: d.id, text: d.label });
                    return option;
                });

                $("#modal_category_select").append("<option></option>");
                $("#modal_category_select").append(options);
            });
    });

    // sortableの読み込み
    $("#search_product").sortable({
        items: ">*:not(.sort-disabled)",
        connectWith: "#save_product",
        // connectWith: "#relation_product table",
    });
    $("#save_product").sortable({
        items: ">*:not(.sort-disabled)",
        connectWith: "#search_product",
        // connectWith: "#relation_product table",
    });

    // 関連商品モーダル保存ボタン押下処理
    $("#relation_product_save").click(function () {
        // POSTデータ
        $.LoadingOverlay("show");
        request({
            url: "/product/detail/save_relation_product",
            type: "POST",
            data: $("#reation_product_save_form").serializeArray(),
            scriptCharset: "utf-8",
        })
            .done(function (data) {
                swal({
                    title: data.title,
                    text: data.text,
                    type: data.type,
                    showConfirmButton: true,
                    confirmButtonText: "OK",
                }).then(function () {
                    location.reload()
                });
            })
            .fail(function (err) {
                var res = err.responseJSON;
                swal({
                    title: res.title,
                    text: res.text,
                    type: res.type,
                    showConfirmButton: true,
                    confirmButtonText: "閉じる",
                });
            })
            .always(function () {
                $.LoadingOverlay("hide");
            })
    });

    // 関連商品テーブル相互に設定画面ボタン押下時
    // $(".relation_product_mutual tr").click(function() {
    $("#relation_product_table_body").on(
        "click",
        ".relation_product_mutual",
        function () {
            // POSTデータ
            var product_id = $(this)
                .closest("tr")
                .find("input[name=table_base_product_id]")
                .val();
            var relation_product_id = $(this)
                .closest("tr")
                .find("input[name=table_relation_product_id]")
                .val();
            $.LoadingOverlay("show");
            request({
                url: "/product/detail/mutual_set_relation_product",
                type: "POST",
                data: {
                    product_id: product_id,
                    relation_product_id: relation_product_id,
                },
                scriptCharset: "utf-8",
            })
                .done(function (data) {
                    swal({
                        title: data.title,
                        text: data.message,
                        type: data.type,
                        showConfirmButton: true,
                        confirmButtonText: "閉じる",
                    });
                })
                .fail(function (err) {
                    const res = err.responseJSON;
                    swal({
                        title: res.title,
                        text: res.message,
                        type: res.type,
                        showConfirmButton: true,
                        confirmButtonText: "閉じる",
                    });
                })
                .always(function () {
                    $.LoadingOverlay("hide");
                });
        }
    );
});
