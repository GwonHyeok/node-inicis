/**
 * Created by GwonHyeok on 2016. 12. 5..
 */
const crypto = require('crypto');
const qs = require('querystring');

class SignatureUtil {

    /**
     * 위변조 방지체크를 signature 생성
     *
     * oid, price, timestamp 3개의 키와 값을
     * key=value 형식으로 하여 '&'로 연결한 하여 SHA-256 Hash로 생성 된값
     * ex) oid=INIpayTest&price=819000&timestamp=2012-02-01 09:19:04.004
     *
     * key기준 알파벳 정렬
     */
    makeSignature(signParam) {
        const orderedParam = Object.keys(signParam).sort().reduce((prev, curr) => {
            prev[curr] = signParam[curr];
            return prev;
        }, {});

        return this.makeHash(this.generateQueryString(orderedParam), "sha256");
    }

    /**
     * 결제보안 추가 인증.
     *
     * @param parameters
     * mid : mid
     * tstamp : auth timestamp
     * MOID : OID
     * TotPrice : total price
     *
     * @returns {*}
     */
    makeSignatureAuth(parameters) {

        if (parameters == null || Object.keys(parameters).length == 0) {
            throw new Error('Parameters can not be empty');
        }

        const signObject = {};  // Sign 할때 사용하는 Object

        const {mid, tstamp, MOID, TotPrice} = parameters;

        // timestamp 마지막 자리 1자리 숫자
        const tstampKey = `${tstamp}`.substr(tstamp.length - 1);

        switch (tstampKey) {
            case 1 :
                Object.assign(signObject, {MOID, mid, tstamp});
                break;
            case 2 :
                Object.assign(signObject, {MOID, tstamp, mid});
                break;
            case 3 :
                Object.assign(signObject, {mid, MOID, tstamp});
                break;
            case 4 :
                Object.assign(signObject, {mid, tstamp, MOID});
                break;
            case 5 :
                Object.assign(signObject, {tstamp, mid, MOID});
                break;
            case 6 :
                Object.assign(signObject, {tstamp, MOID, mid});
                break;
            case 7 :
                Object.assign(signObject, {TotPrice, mid, tstamp});
                break;
            case 8 :
                Object.assign(signObject, {TotPrice, tstamp, mid});
                break;
            case 9 :
                Object.assign(signObject, {TotPrice, MOID, tstamp});
                break;
            case 0 :
                Object.assign(signObject, {TotPrice, tstamp, MOID});
                break;
        }

        // sha256 처리하여 hash 암호화
        return this.makeHash(qs.encode(signObject), "sha256");
    }

    makeHash(data, alg) {
        const hash = crypto.createHash(alg);
        return hash.update(data).digest('hex');
    }

    /**
     * Object를 QueryString 형태로 변환합니다
     *array
     * @param object
     */
    generateQueryString(object) {
        return Object.keys(object).map(key => `${key}=${object[key]}`).join('&');
    }

}

module.exports = new SignatureUtil();