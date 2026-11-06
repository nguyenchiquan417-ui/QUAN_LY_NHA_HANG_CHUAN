const express = require('express');
const router = express.Router();
const donGoiMonController = require('./donGoiMon.controller');
const donGoiMonValidation = require('./donGoiMon.validation');

router.get('/', donGoiMonController.layDanhSach);
router.get('/ban/:banId', donGoiMonController.layDonTheoBan);
router.post('/', donGoiMonValidation.kiemTraTaoDon, donGoiMonController.taoDonMoi);
router.patch('/mon-an/:itemId/trang-thai', donGoiMonController.capNhatTrangThaiMon);
router.post('/mon-an/:itemId/huy', donGoiMonController.huyMon);
router.post('/chuyen-ban', donGoiMonController.chuyenBan);
router.post('/ghep-ban', donGoiMonController.ghepBan);

module.exports = router;
