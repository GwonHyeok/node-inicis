/**
 * Created by GwonHyeok on 2016. 12. 5..
 */
const IniStdPayBill = require('../INIStdPayBill');
const url = require('url');

function expressMiddleware(express, options) {
    const router = express.Router();
    const iniStdPayBill = new IniStdPayBill({
        mid: options.mid,
        signKey: options.signKey
    });

    const onRequest = options.onRequest; // 결제 요청 callback
    const onSuccess = options.onSuccess; // 결제가 성공 callback
    const onError = options.onError; // 결제가 실패 callback
    const onCancel = options.onCancel; // 결제를 취소했을때 callback

    /**
     * 결제시 필요로 하는 파라미터를 반환한다
     * 결제 데이터는 클라이언트에서 입력할 수 있지만 signature, mKey 와 같은 항목들 때문에 이용한다
     */
    router.post('/', (req, res) => {

        const protocol = req.protocol;  // 'http' or 'https'
        const host = req.get('host');   // 'localhost:80'
        const pathname = req.originalUrl;   // '/purchase'

        // 해당 API 가 불렸을때 URL 주소 ex) https://localhost:443/purchase
        const requestUrl = url.format({protocol, host, pathname});

        try {
            const paymentParam = iniStdPayBill.getPaymentParams(requestUrl, req.body);
            if (onRequest) onRequest(paymentParam);
            res.status(200).json({data: paymentParam});
        } catch (e) {
            res.status(403).json({error: {message: e.message}});
        }
    });

    /**
     * PG 사와 결제 완료한 후 해당 API 가 호출 된다.
     * 이 API 에서는 결제 검정을 위한 PG사와 통신이 있으며 해당 통신을 성공해야 결제 승인이 난다.
     *
     * 기본적으로 결제정보가 json 형태로 반환되며
     * 따로 설정한 middleware 가 있다면 req.payment = {} 형태로 저장되어 next가 호출된다
     */
    router.post('/return', (req, res, next) => {
        if (req.body.resultCode === '0000') {
            iniStdPayBill.getAuthRequest(req.body)
                .then(result => {
                    req.payment = result; // req.payment 에 결제 정보 데이터 저장

                    if (onSuccess) return onSuccess(req, res, next); // 결제 성공 콜백이 설정되어있다면 호출
                    res.status(200).json(result)
                })
                .catch(err => {
                    req.payment = err;  // req.payment 에 결제 정보 데이터 저장
                    if (onError) return onError(req, res, next); // 결제 실패 콜백이 설정되어있다면 호출

                    res.status(403).json(err)
                });
        } else {
            req.payment = req.body;  // req.payment 에 결제 정보 데이터 저장
            if (onError) return onError(req, res, next); // 결제 실패 콜백이 설정되어있다면 호출

            res.status(403).json(req.body);
        }
    });

    router.get('/close', (req, res) => {
        res.send('<script language="javascript" type="text/javascript" src="https://stdpay.inicis.com/stdjs/INIStdPay_close.js" charset="UTF-8"></script>');
        if (onCancel) onCancel(req.query.oid); // 결제를 실패했을때 호출
    });

    router.post('/popup', (req, res) => {
        res.send('<script language="javascript" type="text/javascript" src="https://stdpay.inicis.com/stdjs/INIStdPay_popup.js" charset="UTF-8"></script>');
    });

    return router;
}

module.exports = expressMiddleware;