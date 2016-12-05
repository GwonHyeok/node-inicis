/**
 * Created by GwonHyeok on 2016. 12. 5..
 */
const signatureUtil = require('./utils/SignatureUtil');

const co = require('co');
const rp = require('request-promise');
const url = require('url');

class INIStdPayBill {

    constructor(options) {
        if (!('mid' in options)) throw Error('mid 정보가 없습니다');
        if (!('signKey' in options)) throw Error('signKey 정보가 없습니다');

        // 결제에 꼭 필요로 하는 기본 옵션 정보
        this.baseOptions = Object.assign({}, {
            popupUrl: '',
            returnUrl: '',
            closeUrl: '',
            requestByJs: true,
            version: '1.0',
            currency: 'WON',
            acceptmethod: 'SKIN(ORIGINAL)',
            payViewType: 'overlay',
            nointerest: '',
            quotabase: '2:3:4:5:6:7:8:9:10:11:12',
            merchantData: '',
            escw_yn: '',
            ini_logoimage_url: '',
            gopaymethod: ''
        }, options);
    }

    /**
     * 결제시 필요로 하는 파라미터 값들을 반환한다
     *
     * @param requestUrl 결제 요청 주소 URL
     * @param options 결제 옵션 정보
     * @returns {*}
     */
    getPaymentParams(requestUrl, options) {
        if (options.price == null) throw new Error('price 데이터가 없습니다');

        const paymentParam = Object.assign({}, this.baseOptions);

        const timestamp = new Date().getTime();
        const orderNumber = `${paymentParam.mid}_${timestamp}`;
        const price = options.price;

        const mKey = signatureUtil.makeHash(paymentParam.signKey, 'sha256');
        const sign = signatureUtil.makeSignature({
            oid: orderNumber,
            price: price,
            timestamp: timestamp
        });

        // 결제 URL 을 requestUrl 기반으로 만들어 낸다
        if (requestUrl.charAt(requestUrl.length - 1) === '/') {
            requestUrl = requestUrl.substr(0, requestUrl.length - 2);
        }

        const requestUrlObj = url.parse(requestUrl);
        const {pathname} = requestUrlObj;

        paymentParam.popupUrl = url.format(Object.assign({}, requestUrlObj, {pathname: `${pathname}/popup`}));
        paymentParam.returnUrl = url.format(Object.assign({}, requestUrlObj, {pathname: `${pathname}/return`}));
        paymentParam.closeUrl = url.format(Object.assign(
            {},
            requestUrlObj,
            {pathname: `${pathname}/close`, query: {oid: orderNumber}}
        ));

        // 결제 파라미터 assign
        Object.assign(paymentParam, options, {
            oid: orderNumber,
            signature: sign,
            timestamp,
            price,
            mKey
        });

        // signKey 항목은 데이터에서 지운다
        delete paymentParam.signKey;

        return paymentParam;
    }

    /**
     * 결제 완료 후 이니시스 서버에 인증 요청
     *
     * @param body
     *
     * mid : 가맹점 ID 수신 받은 데이터로 설정
     * authToken : 취소 요청 tid에 따라서 유동적(가맹점 수정후 고정)
     * authUrl : 승인요청 API url(수신 받은 값으로 설정, 임의 세팅 금지)
     * netCancelUrl : 망취소 API url(수신 받은 값으로 설정, 임의 세팅 금지)
     */
    getAuthRequest(body) {
        return co(function*() {

            const {mid, authToken, authUrl, netCancelUrl} = body;

            const timestamp = new Date().getTime();
            const charset = "UTF-8"; // 리턴형식[UTF-8,EUC-KR](가맹점 수정후 고정)
            const format = "JSON"; // 리턴형식[XML,JSON,NVP](가맹점 수정후 고정)

            // signature 데이터 생성 (알파벳 순으로 정렬후 NVP 방식으로 나열해 hash)
            const signature = signatureUtil.makeSignature({authToken, timestamp});

            // API 요청 전문 생성
            const authMap = {mid, authToken, signature, timestamp, charset, format};

            // 이니시스에 결제 인증 요청
            const response = yield rp({method: 'POST', uri: authUrl, form: authMap, json: true});
            const secureMap = {mid, tstamp: timestamp, MOID: response.MOID, TotPrice: response.TotPrice};

            // signature 데이터 생성
            const secureSignature = signatureUtil.makeSignatureAuth(secureMap);

            // 결제 인증 데이터 체크
            if (response.resultCode === '0000' && secureSignature == response.authSignature) {
                response.isSuccess = true;
                return response;  // 결제 성공
            } else {
                response.isSuccess = false;

                //결제보안키가 다른 경우. 망취소
                if (secureSignature != response.authSignature && response.resultCode === '0000') {
                    return yield rp({method: 'POST', uri: netCancelUrl, form: authMap, json: true}); // 망취소 결과리턴
                } else {
                    return response; // 결제 실패정보 반환
                }
            }
        });
    }
}

module.exports = INIStdPayBill;