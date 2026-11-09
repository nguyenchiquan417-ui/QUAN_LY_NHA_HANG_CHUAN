const banAnModel = require('./banAn.model');
const khuVucModel = require('../khuVuc/khuVuc.model');
const { taoTokenBaoMatQr, taoDuongDanQrBan, taoAnhQrDataUrl } = require('../../tienIch/taoMaQr');

async function layDanhSachBanAn(boLoc) {
    const danhSach = await banAnModel.layTatCa(boLoc);
    // Bổ sung thông tin URL mã QR cho từng bàn
    return danhSach.map(ban => {
        const token = ban.tokenBaoMat || ban.qrToken || ban.tokenQr || `tok_dev_${ban.id}`;
        return {
            ...ban,
            qrToken: token,
            tokenBaoMat: token,
            duongDanQr: taoDuongDanQrBan(ban.id, token, ban.maBan)
        };
    });
}

async function layChiTietBanAn(id) {
    const ban = await banAnModel.layTheoId(id);
    if (!ban) {
        const loi = new Error('Không tìm thấy bàn ăn');
        loi.status = 404;
        throw loi;
    }
    const token = ban.tokenBaoMat || ban.qrToken || ban.tokenQr || `tok_dev_${ban.id}`;
    const duongDanQr = taoDuongDanQrBan(ban.id, token, ban.maBan);
    return {
        ...ban,
        qrToken: token,
        tokenBaoMat: token,
        duongDanQr
    };
}

async function taoBanAn(duLieu) {
    const khuVuc = await khuVucModel.layTheoId(duLieu.khuVucId);
    if (!khuVuc) {
        const loi = new Error('Khu vực không tồn tại');
        loi.status = 400;
        throw loi;
    }

    const daTonTai = await banAnModel.layTheoMaBan(duLieu.maBan);
    if (daTonTai) {
        const loi = new Error('Mã bàn ăn đã tồn tại');
        loi.status = 409;
        throw loi;
    }

    const banMoi = await banAnModel.taoMoi(duLieu);
    const duongDanQr = taoDuongDanQrBan(banMoi.id, banMoi.tokenBaoMat, banMoi.maBan);
    const anhQr = await taoAnhQrDataUrl(duongDanQr);

    return {
        ...banMoi,
        duongDanQr,
        anhQr
    };
}

async function capNhatBanAn(id, duLieu) {
    await layChiTietBanAn(id);

    if (duLieu.khuVucId) {
        const khuVuc = await khuVucModel.layTheoId(duLieu.khuVucId);
        if (!khuVuc) {
            const loi = new Error('Khu vực không tồn tại');
            loi.status = 400;
            throw loi;
        }
    }

    if (duLieu.maBan) {
        const daTonTai = await banAnModel.layTheoMaBan(duLieu.maBan);
        if (daTonTai && daTonTai.id !== Number(id)) {
            const loi = new Error('Mã bàn ăn đã bị trùng lặp');
            loi.status = 409;
            throw loi;
        }
    }

    return await banAnModel.capNhat(id, duLieu);
}

async function xoaBanAn(id) {
    const ban = await layChiTietBanAn(id);
    // US-027: Chỉ xóa bàn ăn chưa phát sinh dữ liệu giao dịch
    if (ban.daPhatSinhGiaoDich) {
        const loi = new Error('Bàn ăn đã phát sinh giao dịch, không thể xóa để bảo toàn lịch sử. Bạn có thể chọn Tạm khóa bàn.');
        loi.status = 400;
        throw loi;
    }
    return await banAnModel.xoa(id);
}

async function layMaQrBanAn(id) {
    const ban = await layChiTietBanAn(id);
    const duongDanQr = taoDuongDanQrBan(ban.id, ban.tokenBaoMat, ban.maBan);
    const anhQr = await taoAnhQrDataUrl(duongDanQr);

    return {
        id: ban.id,
        maBan: ban.maBan,
        tenBan: ban.tenBan,
        duongDanQr,
        anhQr
    };
}

async function lamMoiTokenQr(id) {
    await layChiTietBanAn(id);
    const tokenMoi = taoTokenBaoMatQr();
    const banCapNhat = await banAnModel.lamMoiToken(id, tokenMoi);
    const duongDanQr = taoDuongDanQrBan(banCapNhat.id, banCapNhat.tokenBaoMat, banCapNhat.maBan);
    const anhQr = await taoAnhQrDataUrl(duongDanQr);

    return {
        ...banCapNhat,
        duongDanQr,
        anhQr
    };
}

async function layQrTatCaBanTheoKhuVuc(khuVucId) {
    const danhSach = await banAnModel.layTatCa({ khuVucId });
    const ketQua = await Promise.all(
        danhSach.map(async (ban) => {
            const duongDanQr = taoDuongDanQrBan(ban.id, ban.tokenBaoMat, ban.maBan);
            const anhQr = await taoAnhQrDataUrl(duongDanQr);
            return {
                id: ban.id,
                maBan: ban.maBan,
                tenBan: ban.tenBan,
                khuVucId: ban.khuVucId,
                duongDanQr,
                anhQr
            };
        })
    );
    return ketQua;
}

module.exports = {
    layDanhSachBanAn,
    layChiTietBanAn,
    taoBanAn,
    capNhatBanAn,
    xoaBanAn,
    layMaQrBanAn,
    lamMoiTokenQr,
    layQrTatCaBanTheoKhuVuc
};
