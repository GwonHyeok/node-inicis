/**
 * Created by GwonHyeok on 2016. 11. 29..
 */
var NodeINIStdPay = {

    payForm: null,
    payFormId: null,
    paymentUrl: null,

    payFormData: {},

    init: function (options) {
        if (options == null || !options.paymentUrl) return console.log('Node Inicis 라이브러리를 초기화 할 수 없습니다. paymentUrl을 입력해주세요');

        window.NodeINIStdPay = NodeINIStdPay;

        this.paymentUrl = options.paymentUrl;

        // 결제에 사용되는 Form 추가
        this.payFormId = 'node-pay-' + new Date().getTime();

        this.payForm = document.createElement("form");
        this.payForm.setAttribute('method', "post");
        this.payForm.setAttribute('action', "");
        this.payForm.setAttribute('id', this.payFormId);
        this.payForm.setAttribute('style', 'display: none');

        document.getElementsByTagName('body')[0].appendChild(this.payForm);
    },

    pay: function (params, error) {
        $.ajax({
            type: "POST",
            url: this.paymentUrl,
            data: params,
            success: function (response) {
                window.NodeINIStdPay.mergeFormData(response.data);
                window.NodeINIStdPay.insertFormInput(true);

                // 결제 요청
                INIStdPay.pay(window.NodeINIStdPay.payFormId);
            },
            error: error
        });
    },

    insertFormInput(removePre = false) {
        if (removePre) $(window.NodeINIStdPay.payForm).empty();

        Object.keys(this.payFormData).forEach(function (formKey) {
            var input = document.createElement('input');
            input.setAttribute('type', "text");
            input.setAttribute('name', formKey);
            input.setAttribute('value', window.NodeINIStdPay.payFormData[formKey]);
            window.NodeINIStdPay.payForm.appendChild(input);
        });
    },

    mergeFormData(source) {
        if (typeof source !== 'object') return;

        Object.keys(source).forEach(function (formKey) {
            window.NodeINIStdPay.payFormData[formKey] = source[formKey];
        });
    }
};