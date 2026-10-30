/* =====================================================================
   BERANDA MASTER DATA (gabungan Beranda + Dasbor)
   Urutan: perlu tindakan › omzet per saluran › saldo & pengeluaran akun › PO berjalan.
   Data: rpc beranda_data(bulan) + saldo akun (hasil_hitung md:beranda) + daftar tindakan dari Master Data.
   ===================================================================== */
(function () {
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−Rp' : 'Rp') + fmt(Math.abs(n)); }
  function jt(n) {
    n = Number(n) || 0; var a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e9) return s + 'Rp' + (a / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M';
    if (a >= 1e6) return s + 'Rp' + (a / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
    if (a >= 1e3) return s + 'Rp' + Math.round(a / 1e3).toLocaleString('id-ID') + ' rb';
    return s + 'Rp' + fmt(a);
  }
  function tgl(d) { var p = String(d || '').split('-'); return p.length < 3 ? '' : Number(p[2]) + ' ' + BLS[Number(p[1]) - 1]; }
  function namaBulan(b) { var p = String(b || '').split('-'); return (BLN[Number(p[1]) - 1] || '') + ' ' + p[0]; }
  function rentang(a, b) {
    var pa = String(a).split('-'), pb = String(b).split('-');
    return pa[1] === pb[1] ? Number(pa[2]) + '–' + Number(pb[2]) + ' ' + BLS[Number(pb[1]) - 1] : tgl(a) + ' – ' + tgl(b);
  }
  // Perubahan dibanding bulan lalu. Kosong bila bulan lalu belum tercatat.
  function beda(v, l, naikBaik) {
    if (!(l > 0)) return '';
    var p = (v - l) / l * 100, r = Math.abs(p) < 0.5 ? '±0%' : (p > 0 ? '▲ ' : '▼ ') + Math.abs(p).toLocaleString('id-ID', { maximumFractionDigits: p > -10 && p < 10 ? 1 : 0 }) + '%';
    var baik = Math.abs(p) < 0.5 ? '' : ((p > 0) === (naikBaik !== false) ? ' up' : ' dn');
    return '<span class="bd-d' + baik + '">' + r + '</span>';
  }

  var CSS = '' +
    '.bx-top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px 16px;margin:0 0 14px}' +
    '.bx-top h2{margin:0;font-size:20px;font-weight:800;letter-spacing:-.01em}' +
    '.bx-top p{margin:2px 0 0;font-size:13px;color:var(--abu)}' +
    '.bx-aksi{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.bx-aksi .tbl{height:40px}' +
    '.bx-top select{height:40px;padding:0 12px;border:1px solid var(--garis);border-radius:10px;background:#fff;font-weight:700}' +
    '.bx-tdk{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}' +
    '.bx-tdk button{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:7px 12px;border:1px solid #F0D48A;border-radius:999px;background:var(--kuningMuda);color:#6B4300;font-size:13px;font-weight:700;cursor:pointer;text-align:left}' +
    '.bx-tdk button.n{border-color:var(--garis);background:#fff;color:var(--teks2)}' +
    '.bx-tdk button:hover{filter:brightness(.97)}' +
    '.bx-tdk .ok{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:var(--hijauMuda);color:var(--hijau);font-size:13px;font-weight:700}' +
    '.bx-grid{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:16px;align-items:start}' +
    '.bx-grid>.cd{margin:0}' +
    '.bx-po{grid-column:1/-1}' +
    '@media (max-width:1100px){.bx-grid{grid-template-columns:1fr}}' +
    '.bx-besar{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px}' +
    '.bx-besar b{font-size:32px;font-weight:800;letter-spacing:-.02em;line-height:1.1}' +
    '.bx-besar span{font-size:13px;color:var(--abu)}' +
    '.bd-d{display:inline-block;padding:1px 7px;border-radius:999px;background:var(--garis2);color:var(--teks2);font-size:12px;font-weight:700;white-space:nowrap}' +
    '.bd-d.up{background:var(--hijauMuda);color:var(--hijau)}.bd-d.dn{background:var(--merahMuda);color:var(--merah)}' +
    '.bx-sal{display:flex;flex-direction:column}' +
    '.bx-g{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:12px 0 6px;border-top:1px solid var(--garis);font-size:13px;font-weight:800;color:var(--teks2)}' +
    '.bx-g:first-child{border-top:0;padding-top:2px}' +
    '.bx-r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 12px;padding:7px 0 7px 12px;align-items:center}' +
    '.bx-r .n{font-size:14px;font-weight:600;min-width:0}' +
    '.bx-r .n small{display:block;font-size:12px;font-weight:500;color:var(--abu)}' +
    '.bx-r .n small.w{color:var(--kuning);font-weight:700}' +
    '.bx-r .v{text-align:right;font-size:14.5px;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.bx-r .v .bd-d{margin-left:6px;vertical-align:1px}' +
    '.bx-r .bar{grid-column:1/-1;height:6px;border-radius:99px;background:var(--garis2);overflow:hidden}' +
    '.bx-r .bar i{display:block;height:100%;border-radius:99px;background:var(--biru)}' +
    '.bx-akun{border:1px solid var(--garis);border-radius:14px;overflow:hidden}' +
    '.bx-akun+.bx-akun{margin-top:10px}' +
    '.bx-akun summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;padding:14px 16px;align-items:center}' +
    '.bx-akun summary::-webkit-details-marker{display:none}' +
    '.bx-akun summary:hover{background:#F7F9FB}' +
    '.bx-akun .nm{font-size:13px;font-weight:700;color:var(--abu)}' +
    '.bx-akun .sd{font-size:24px;font-weight:800;letter-spacing:-.01em;font-variant-numeric:tabular-nums}' +
    '.bx-akun .sd.mn{color:var(--merah)}' +
    '.bx-akun .kl{grid-column:1/-1;font-size:12.5px;color:var(--teks2)}' +
    '.bx-akun .kl b{font-variant-numeric:tabular-nums}' +
    '.bx-akun .pa{grid-row:1/3;grid-column:2;align-self:center;font-size:12.5px;font-weight:700;color:var(--biru);white-space:nowrap}' +
    '.bx-akun[open] .pa .t1,.bx-akun:not([open]) .pa .t2{display:none}' +
    '.bx-akun .isi{border-top:1px solid var(--garis);background:#FAFBFC;max-height:420px;overflow:auto}' +
    '.bx-tr{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:2px 10px;padding:10px 16px;border-bottom:1px solid var(--garis2);font-size:13.5px}' +
    '.bx-tr .t{color:var(--abu);font-size:12.5px;padding-top:1px}' +
    '.bx-tr small{display:block;color:var(--abu);font-size:12px}' +
    '.bx-tr .v{font-weight:800;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.bx-tr.p .v{color:var(--abu);font-weight:700}' +
    '.bx-lain summary{display:flex;justify-content:space-between;gap:10px;padding:12px 4px 4px;cursor:pointer;font-size:13.5px;font-weight:700;color:var(--teks2);list-style:none}' +
    '.bx-lain summary::-webkit-details-marker{display:none}' +
    '.bx-lain .bx-r{padding-left:4px}' +
    '.bx-fl{display:inline-flex;flex-wrap:wrap;gap:6px}' +
    '.bx-fl button{height:34px;padding:0 12px;border:1px solid var(--garis);border-radius:999px;background:#fff;font-size:13px;font-weight:700;color:var(--teks2);cursor:pointer}' +
    '.bx-fl button[aria-pressed="true"]{background:var(--navy);border-color:var(--navy);color:#fff}' +
    '.bx-pog h4{margin:6px 0 2px;font-size:13px;font-weight:800;color:var(--teks2);display:flex;justify-content:space-between;gap:8px}' +
    '.bx-pog h4 span{font-weight:600;color:var(--abu)}' +
    '.bx-p{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 14px;padding:12px 0;border-top:1px solid var(--garis2)}' +
    '.bx-p .b{font-size:14px;font-weight:700;min-width:0}' +
    '.bx-p .m{font-size:12.5px;color:var(--abu)}' +
    '.bx-p .r{text-align:right;white-space:nowrap}' +
    '.bx-p .r b{display:block;font-size:14.5px;font-variant-numeric:tabular-nums}' +
    '.bx-um{display:inline-block;margin-top:3px;padding:1px 8px;border-radius:999px;background:var(--garis2);color:var(--teks2);font-size:12px;font-weight:700}' +
    '.bx-um.w{background:var(--kuningMuda);color:var(--kuning)}.bx-um.m{background:var(--merahMuda);color:var(--merah)}' +
    '.bx-tag{display:inline-block;margin-right:6px;padding:0 6px;border-radius:6px;background:var(--biruMuda);color:var(--biruTua);font-size:11.5px;font-weight:700;vertical-align:1px}' +
    '.bx-gf{position:relative;margin:4px 0 2px}' +
    '.bx-gf svg{display:block;width:100%;height:auto;overflow:visible}.bx-svg{width:100%}' +
    '.bx-gf .lgd{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--teks2);margin:0 0 6px}' +
    '.bx-gf .lgd span{display:inline-flex;align-items:center;gap:6px}' +
    '.bx-gf .lgd i{width:10px;height:10px;border-radius:3px;display:inline-block}' +
    '.bx-gf .col{cursor:default}' +
    '.bx-gf .col:hover .hl,.bx-gf .col:focus .hl{fill:rgba(15,27,42,.05)}' +
    '.bx-gf .col:focus{outline:none}' +
    '.bx-tip{position:absolute;z-index:5;pointer-events:none;min-width:190px;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid var(--garis);box-shadow:0 8px 24px rgba(15,27,42,.12);font-size:12.5px;color:var(--teks2)}' +
    '.bx-tip b.t{display:block;font-size:13px;color:var(--tinta);margin-bottom:6px}' +
    '.bx-tip div{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:2px 0}' +
    '.bx-tip div span{display:inline-flex;align-items:center;gap:6px}' +
    '.bx-tip div i{width:12px;height:2.5px;border-radius:2px;display:inline-block}' +
    '.bx-tip div b{color:var(--tinta);font-variant-numeric:tabular-nums}' +
    '.bx-tip .tot{border-top:1px solid var(--garis2);margin-top:4px;padding-top:6px}' +
    '.bx-tbl summary{cursor:pointer;font-size:12.5px;font-weight:700;color:var(--biru);list-style:none;padding:4px 0}' +
    '.bx-tbl summary::-webkit-details-marker{display:none}' +
    '.bx-tbl .gulir{max-height:300px;overflow:auto;border:1px solid var(--garis2);border-radius:10px;margin-top:6px}' +
    '.bx-tbl table{font-size:12.5px}.bx-tbl th,.bx-tbl td{padding:6px 8px!important}' +
    'html.m-m .bx-besar b{font-size:28px}' +
    'html.m-m .bx-akun .sd{font-size:22px}' +
    'html.m-m .bx-top h2{font-size:18px}' +
    'html.m-d.m-bx #mHead{display:none}' +
    '.bx-gf .col .gd{opacity:0}.bx-gf .col:hover .gd,.bx-gf .col:focus .gd{opacity:1}' +
    '.bh-head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:14px 20px;margin:0 0 22px}' +
    '.bh-bc{font-size:14px;color:var(--abu);font-weight:500}.bh-bc span{margin:0 6px;color:#A3AFBD}' +
    '.bh-jd h1{margin:6px 0 4px;font-size:34px;font-weight:800;letter-spacing:-.02em;line-height:1.1}' +
    '.bh-jd p{margin:0;font-size:14.5px;color:var(--abu)}' +
    '.bh-kn{display:flex;align-items:center;gap:14px;flex-wrap:wrap}' +
    '.bh-bln{position:relative;display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 14px;border:1px solid var(--garis);border-radius:12px;background:#fff;color:var(--teks2);cursor:pointer}' +
    '.bh-bln select{appearance:none;-webkit-appearance:none;border:0;background:transparent;font-weight:700;font-size:15px;padding:0 22px 0 0;margin-right:-22px;cursor:pointer;color:var(--tinta)}' +
    '.bh-bln select:focus{outline:none}.bh-bln:focus-within{outline:2px solid var(--biru);outline-offset:2px}' +
    '.bh-bel{position:relative;width:46px;height:46px;border:0;border-radius:12px;background:transparent;color:var(--teks2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center}' +
    '.bh-bel:hover{background:#fff}.bh-bel i{position:absolute;top:5px;right:4px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#1F7AE0;color:#fff;font-size:11px;font-style:normal;font-weight:800;line-height:18px;text-align:center}' +
    '.bh-av{position:relative}' +
    '.bh-av>button{display:flex;align-items:center;gap:10px;border:0;background:transparent;cursor:pointer;padding:4px 6px 4px 4px;border-radius:999px;color:var(--teks2)}' +
    '.bh-av>button:hover{background:#fff}' +
    '.bh-av .in{width:44px;height:44px;border-radius:50%;background:#14306A;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:15px}' +
    '.bh-av .nm{display:flex;flex-direction:column;text-align:left;font-weight:700;font-size:15px;color:var(--tinta);line-height:1.2}.bh-av .nm small{font-size:12px;font-weight:500;color:var(--abu)}' +
    '.bh-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:70;min-width:230px;padding:6px;background:#fff;border:1px solid var(--garis);border-radius:14px;box-shadow:0 12px 32px rgba(15,27,42,.14)}' +
    '.bh-menu .em{padding:8px 12px 10px;font-size:12.5px;color:var(--abu);border-bottom:1px solid var(--garis2);margin-bottom:4px}' +
    '.bh-menu a,.bh-menu button{display:block;width:100%;text-align:left;padding:10px 12px;border:0;border-radius:10px;background:transparent;font-size:14px;font-weight:600;color:var(--teks2);text-decoration:none;cursor:pointer}' +
    '.bh-menu a:hover,.bh-menu button:hover{background:var(--latar)}' +
    '.bh-ik{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:48px;height:48px;border-radius:14px}' +
    '.bh-ik.biru{background:#E8F1FD;color:#1F6FE0}.bh-ik.hijau{background:#E3F6EC;color:#12965A}.bh-ik.jingga{background:#FDEDE3;color:#E4621B}.bh-ik.ungu{background:#EFEAFD;color:#7350E0}.bh-ik.kuning{background:#FFF1D1;color:#C98100}' +
    '.bh-ik.bulat{width:58px;height:58px;border-radius:50%;color:#fff}' +
    '.bh-ik.bulat.biru{background:#1F6FE0}.bh-ik.bulat.hijau{background:#16A864}.bh-ik.bulat.jingga{background:#F07126}.bh-ik.bulat.ungu{background:#7E5BEF}.bh-ik.bulat.kuning{background:#F5A800}' +
    '.bh-ik.bulat svg{width:26px;height:26px}' +
    '.bh-ik.kcl{width:44px;height:44px;border-radius:12px}' +
    '.bh-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:0 0 16px}' +
    '.bh-k{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px 16px;align-items:center;padding:20px 20px 18px;border:1px solid var(--garis);border-radius:16px;background:#fff;text-align:left;cursor:pointer;color:inherit;text-decoration:none;font:inherit;transition:box-shadow .15s,border-color .15s}' +
    '.bh-k:hover{border-color:#C9D6E6;box-shadow:0 6px 18px rgba(15,27,42,.07)}' +
    '.bh-k.hijau{background:#F4FBF7;border-color:#D7EFE2}.bh-k.jingga{background:#FFF8F3;border-color:#F8E0D0}.bh-k.ungu{background:#F8F6FE;border-color:#E4DDFB}' +
    '.bh-k .tx{display:flex;flex-direction:column;min-width:0}.bh-k .l{font-size:15px;font-weight:700;color:var(--tinta)}' +
    '.bh-k .tx b{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1.15;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.bh-dl{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;font-size:13.5px;color:var(--abu)}' +
    '.bh-dl b{display:inline-flex;align-items:center;gap:3px;font-weight:800;color:var(--teks2)}.bh-dl b.up{color:#12965A}.bh-dl b.dn{color:#D4380D}' +
    '.bh-dl .sb b{display:inline}' +
    '.bh-awas{display:flex;flex-wrap:wrap;align-items:center;gap:14px 18px;padding:18px 22px;margin:0 0 16px;border:1px solid #F5DDA6;border-radius:16px;background:#FFF9EC}' +
    '.bh-awas.ok{border-color:#CFEBDC;background:#F4FBF7}' +
    '.bh-awas .bh-ik.bulat{width:48px;height:48px}' +
    '.bh-awas .tx{display:flex;flex-direction:column;flex:1 1 220px}.bh-awas .tx b{font-size:18px;font-weight:800}.bh-awas .tx span{font-size:14px;color:var(--teks2)}' +
    '.bh-awas .ch{display:flex;flex-wrap:wrap;gap:10px;flex:10 1 420px;justify-content:flex-end}' +
    '.bh-awas .ch button{min-height:42px;padding:8px 16px;border:1px solid #EFCB7B;border-radius:999px;background:#FFF3D6;color:#6B4300;font-size:14px;font-weight:700;cursor:pointer}' +
    '.bh-awas .ch button.n{background:#fff;border-color:var(--garis);color:var(--teks2)}.bh-awas .ch button:hover{filter:brightness(.97)}' +
    '.bh-kartu{border-radius:16px}' +
    '.bh-kp{display:flex;align-items:center;gap:14px;margin:0 0 14px}' +
    '.bh-kp>div{flex:1;min-width:0}.bh-kp h3{margin:0;font-size:19px;font-weight:800}.bh-kp p{margin:2px 0 0;font-size:13.5px;color:var(--abu)}' +
    '.bh-kp .bh-bln{height:42px}' +
    '.bx-grid{grid-template-columns:minmax(0,3fr) minmax(0,2fr)}.bx-grid>.bx-po{grid-column:auto}' +
    '.bx-akun summary{grid-template-columns:auto minmax(0,1fr) auto;column-gap:14px}' +
    '.bx-akun summary .bh-ik{grid-row:1/4;align-self:start}' +
    '.bx-akun .pa{grid-row:1/3;grid-column:3}.bx-akun .kl{grid-column:2/-1}' +
    '.bh-pintas{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:16px}' +
    '@media (max-width:1250px){.bh-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
    '@media (max-width:1100px){.bx-grid{grid-template-columns:1fr}}' +
    'html.m-m .bh-bc,html.m-m .bh-jd h1{display:none}html.m-m .bh-jd p{font-size:13px}' +
    'html.m-m .bh-head{margin-bottom:14px;gap:10px}html.m-m .bh-kn{width:100%;justify-content:space-between;gap:8px}' +
    'html.m-m .bh-av .nm{display:none}html.m-m .bh-bln{height:44px;flex:1}html.m-m .bh-bln select{flex:1}' +
    'html.m-m .bh-kpi{grid-template-columns:1fr 1fr;gap:10px}html.m-m .bh-k{padding:14px;gap:10px}html.m-m .bh-k .bh-ik.bulat{width:40px;height:40px}html.m-m .bh-k .bh-ik.bulat svg{width:20px;height:20px}' +
    'html.m-m .bh-k .tx b{font-size:21px}html.m-m .bh-k .l{font-size:13px}html.m-m .bh-dl{font-size:12px}' +
    'html.m-m .bh-awas{padding:14px}html.m-m .bh-awas .ch{justify-content:flex-start}html.m-m .bh-awas .ch button{font-size:13px;min-height:38px}' +
    'html.m-m .bh-kp .bh-bln{display:none}';

  function pasangCss() {
    if (document.getElementById('bxCss2')) return;
    var s = document.createElement('style'); s.id = 'bxCss2'; s.textContent = CSS; document.head.appendChild(s);
  }

  // Batas umur PO sebelum ditandai: impor 45 hari, lokal 7 hari.
  function umurKelas(p) { var batas = /impor/i.test(p.asal) ? 45 : 7; return p.umur > batas ? 'm' : p.umur > batas * 0.7 ? 'w' : ''; }

  function tindakan(B, T) {
    var h = '', n = 0;
    (T || []).forEach(function (t) { h += '<button type="button" class="' + (t.w ? '' : 'n') + '" data-buka="' + esc(t.buka) + '">' + esc(t.teks) + ' ›</button>'; n++; });
    var lama = (B.po || []).filter(function (p) { return umurKelas(p) === 'm'; });
    if (lama.length) { h += '<button type="button" data-gulir="bxPo">' + lama.length + ' PO lewat batas waktu belum diterima ›</button>'; n++; }
    return '<div class="bx-tdk" aria-label="Perlu tindakan">' + (n ? h : '<span class="ok">✓ Tidak ada yang perlu ditindak</span>') + '</div>';
  }


  // ---------- Grafik omzet harian (batang bertumpuk per kelompok saluran) ----------
  // Warna: palet kategorikal tervalidasi (urutan tetap), satu sumbu, celah 2px antar-segmen, tooltip per hari.
  var SERI = [['o', 'Official', '#2a78d6'], ['c', 'Consignment', '#eb6834'], ['f', 'Toko Offline', '#1baf7a'], ['r', 'Reseller', '#eda100']];
  function skala(mx) {
    var kasar = mx / 4, p = Math.pow(10, Math.floor(Math.log10(kasar || 1))), m = kasar / p;
    var langkah = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
    return { langkah: langkah, atas: Math.ceil(mx / langkah) * langkah || langkah };
  }
  function labelSumbu(v) { return v >= 1e6 ? (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : v >= 1e3 ? Math.round(v / 1e3) + ' rb' : String(v); }
  var TOTAL = ['t', 'Total', '#1B3C8C'];
  function svgGrafik(B, W) {
    var H = B.harian || [];
    var ofAkhir = null; (B.omzet || []).forEach(function (x) { if (x.g === 'Official' && x.s && (!ofAkhir || x.s > ofAkhir)) ofAkhir = x.s; });
    var tot = H.map(function (d) { return d.o + d.c + d.f + d.r; }), mx = Math.max.apply(null, tot.concat([1]));
    var sempit = W < 520, sk = skala(mx), Hh = sempit ? 230 : 290, kiri = 46, kanan = 10, atas = 10, bawah = 40, lw = W - kiri - kanan, lh = Hh - atas - bawah;
    var n = H.length, slot = lw / Math.max(1, n);
    var y = function (v) { return atas + lh - v / sk.atas * lh; }, x = function (i) { return kiri + i * slot + slot / 2; };
    var g = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Grafik garis omzet harian per saluran">' +
      '<defs><linearGradient id="bxLuas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a78d6" stop-opacity=".20"/><stop offset="1" stop-color="#2a78d6" stop-opacity=".02"/></linearGradient>' +
      '<pattern id="bxArsir" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#F7F9FB"/><line x1="0" y1="0" x2="0" y2="6" stroke="#E2E7EE" stroke-width="2"/></pattern></defs>';
    if (B.berjalan && ofAkhir && ofAkhir < B.sampai) {
      var iA = H.findIndex(function (d) { return d.t > ofAkhir; });
      if (iA >= 0) {
        var xa = kiri + iA * slot;
        g += '<rect x="' + xa.toFixed(1) + '" y="' + atas + '" width="' + (kiri + lw - xa).toFixed(1) + '" height="' + lh + '" fill="url(#bxArsir)"/>' +
          ((kiri + lw - xa) >= 150 ? '<text x="' + (xa + (kiri + lw - xa) / 2) + '" y="' + (atas + 16) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="#5A6677">Official belum di-upload</text>'
            : '<text x="' + (kiri + lw - 2) + '" y="' + (atas + 14) + '" text-anchor="end" font-size="11" font-weight="700" fill="#5A6677"><tspan x="' + (kiri + lw - 2) + '">Official</tspan><tspan x="' + (kiri + lw - 2) + '" dy="13">belum</tspan><tspan x="' + (kiri + lw - 2) + '" dy="13">upload</tspan></text>');
      }
    }
    for (var v = 0; v <= sk.atas + 1; v += sk.langkah) {
      g += '<line x1="' + kiri + '" x2="' + (kiri + lw) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" stroke="' + (v === 0 ? '#C9D2DC' : '#E9EEF4') + '" stroke-width="1"' + (v === 0 ? '' : ' stroke-dasharray="3 4"') + '/>' +
        '<text x="' + (kiri - 8) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#5A6677">' + labelSumbu(v) + '</text>';
    }
    // Garis: total (dengan arsiran lembut) lalu tiap saluran yang punya omzet.
    var seri = [TOTAL].concat(SERI.filter(function (s) { return H.some(function (d) { return d[s[0]] > 0; }); }));
    var nilai = function (d, k) { return k === 't' ? d.o + d.c + d.f + d.r : d[k]; };
    var titik = sempit || n > 25 ? 2.6 : 3.4;
    seri.forEach(function (s, k) {
      var jalur = H.map(function (d, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(nilai(d, s[0])).toFixed(1); }).join('');
      if (s[0] === 't' && n) g += '<path d="' + jalur + 'L' + x(n - 1).toFixed(1) + ',' + y(0).toFixed(1) + 'L' + x(0).toFixed(1) + ',' + y(0).toFixed(1) + 'Z" fill="url(#bxLuas)"/>';
      g += '<path d="' + jalur + '" fill="none" stroke="' + s[2] + '" stroke-width="' + (s[0] === 't' ? 2.6 : 2) + '" stroke-linejoin="round" stroke-linecap="round"/>';
      H.forEach(function (d, i) { g += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(nilai(d, s[0])).toFixed(1) + '" r="' + titik + '" fill="' + s[2] + '" stroke="#fff" stroke-width="1.2"/>'; });
    });
    var tiap = n > 20 ? (sempit ? 5 : 2) : 1;
    H.forEach(function (d, i) {
      var tg = Number(String(d.t).slice(8));
      g += '<g class="col" tabindex="0" data-i="' + i + '"><rect x="' + (kiri + i * slot).toFixed(1) + '" y="' + atas + '" width="' + slot.toFixed(1) + '" height="' + lh + '" fill="transparent"/>' +
        '<line class="gd" x1="' + x(i).toFixed(1) + '" x2="' + x(i).toFixed(1) + '" y1="' + atas + '" y2="' + (atas + lh) + '" stroke="#8FA0B5" stroke-width="1" stroke-dasharray="3 3"/></g>';
      if (tg === 1 || (tg - 1) % tiap === 0) g += '<text x="' + x(i).toFixed(1) + '" y="' + (atas + lh + 18) + '" text-anchor="middle" font-size="11" fill="#5A6677">' + tg + '</text>';
    });
    g += '<text x="' + (kiri + lw / 2) + '" y="' + (Hh - 3) + '" text-anchor="middle" font-size="11.5" font-weight="600" fill="#5A6677">Tanggal</text>';
    return g + '</svg>';
  }
  function grafik(B, pilihBulan) {
    var H = B.harian || [];
    var adaSeri = [TOTAL].concat(SERI.filter(function (x) { return H.some(function (d) { return d[x[0]] > 0; }); }));
    var lg = '<div class="lgd">' + adaSeri.map(function (s) { return '<span><i style="background:' + s[2] + '"></i>' + s[1] + '</span>'; }).join('') + '</div>';
    var tb = '<details class="bx-tbl"><summary>Lihat tabel harian ›</summary><div class="gulir"><table class="tabel"><thead><tr><th>Tanggal</th>' +
      SERI.map(function (s) { return '<th class="r">' + s[1] + '</th>'; }).join('') + '<th class="r">Total</th></tr></thead><tbody>' +
      H.slice().reverse().map(function (d) { return '<tr><td>' + esc(tgl(d.t)) + '</td>' + SERI.map(function (s) { return '<td class="r">' + (d[s[0]] ? fmt(d[s[0]]) : '–') + '</td>'; }).join('') + '<td class="r"><b>' + fmt(d.o + d.c + d.f + d.r) + '</b></td></tr>'; }).join('') +
      '</tbody></table></div></details>';
    return '<div class="cd bh-kartu"><div class="bh-kp"><span class="bh-ik biru">' + IKN.grafik + '</span><div><h3>Omzet harian</h3><p>Pergerakan omzet per hari pada bulan ' + esc(namaBulan(B.bulan)) + '.</p></div>' + pilihBulan('bxBulan2') + '</div>' +
      (H.length ? '<div class="bx-gf" id="bxGf">' + lg + '<div class="bx-svg"></div></div>' + tb : '<div class="ksg">Belum ada omzet di bulan ini.</div>') + '</div>';
  }
  function pasangTip(el, B) {
    var gf = el.querySelector('#bxGf'); if (!gf) return;
    var wadah = gf.querySelector('.bx-svg'); wadah.innerHTML = svgGrafik(B, Math.max(280, Math.round(wadah.clientWidth || 720)));
    if (!window.__bxUkur) { window.__bxUkur = true; var tunda; window.addEventListener('resize', function () { clearTimeout(tunda); tunda = setTimeout(function () { var w = document.querySelector('#bxGf .bx-svg'); if (w && window.__bxB) { w.innerHTML = svgGrafik(window.__bxB, Math.max(280, Math.round(w.clientWidth))); if (window.__bxKol) window.__bxKol(); } }, 200); }); }
    window.__bxB = B;
    var tip = document.createElement('div'); tip.className = 'bx-tip'; tip.hidden = true; gf.appendChild(tip);
    function tampil(col, ev) {
      var d = B.harian[Number(col.getAttribute('data-i'))]; if (!d) return;
      tip.textContent = '';
      var t = document.createElement('b'); t.className = 't'; t.textContent = tgl(d.t) + ' ' + String(d.t).slice(0, 4); tip.appendChild(t);
      SERI.slice().reverse().forEach(function (s) {
        var r = document.createElement('div'), a = document.createElement('span'), i = document.createElement('i'), v = document.createElement('b');
        i.style.background = s[2]; a.appendChild(i); a.appendChild(document.createTextNode(s[1])); v.textContent = d[s[0]] ? rp(d[s[0]]) : '–';
        r.appendChild(a); r.appendChild(v); tip.appendChild(r);
      });
      var r2 = document.createElement('div'), a2 = document.createElement('span'), v2 = document.createElement('b');
      r2.className = 'tot'; a2.textContent = 'Total'; v2.textContent = rp(d.o + d.c + d.f + d.r); r2.appendChild(a2); r2.appendChild(v2); tip.appendChild(r2);
      tip.hidden = false;
      var gb = gf.getBoundingClientRect(), cb = col.getBoundingClientRect(), tw = tip.offsetWidth;
      var x = cb.left - gb.left + cb.width / 2 + 12; if (x + tw > gb.width) x = cb.left - gb.left + cb.width / 2 - tw - 12; if (x < 0) x = Math.max(0, (gb.width - tw) / 2);
      tip.style.left = x + 'px'; tip.style.top = '40px';
    }
    function pasangKol() { gf.querySelectorAll('.col').forEach(function (c) {
      c.addEventListener('pointerenter', function (e) { tampil(c, e); });
      c.addEventListener('focus', function (e) { tampil(c, e); });
      c.addEventListener('click', function (e) { tampil(c, e); });
      c.addEventListener('pointerleave', function () { tip.hidden = true; });
      c.addEventListener('blur', function () { tip.hidden = true; });
    }); }
    window.__bxKol = pasangKol; pasangKol();
  }

  function omzet(B) {
    var O = B.omzet || [], tot = 0, totL = 0, G = {}, urut = [];
    O.forEach(function (x) { tot += x.v; totL += x.l; if (!G[x.g]) { G[x.g] = []; urut.push(x.g); } G[x.g].push(x); });
    var mx = Math.max.apply(null, O.map(function (x) { return x.v; }).concat([1]));
    var adaLalu = totL > 0;
    var h = '<div class="cd bh-kartu" id="bxRinci"><div class="bh-kp"><span class="bh-ik hijau">' + IKN.toko + '</span><div><h3>Omzet per saluran</h3><p>' + esc(rentang(B.dari, B.sampai)) + ' · total ' + rp(tot) + (adaLalu ? ' · bulan lalu ' + jt(totL) : '') + '</p></div></div><div class="bx-sal">';
    var JUDUL = { 'Official': 'Official (marketplace)', 'Consignment': 'Consignment', 'Toko Offline': 'Toko Offline', 'Reseller': 'Reseller' };
    urut.forEach(function (g) {
      var L = G[g], s = 0, sl = 0; L.forEach(function (x) { s += x.v; sl += x.l; });
      var satu = L.length === 1 && L[0].n === g;
      if (!satu) h += '<div class="bx-g"><span>' + esc(JUDUL[g] || g) + '</span><span>' + jt(s) + '</span></div>';
      else h += '<div class="bx-g" style="padding-bottom:0"></div>';
      L.forEach(function (x) {
        var ket;
        if (g === 'Official') ket = x.s ? 'data file pesanan s/d ' + tgl(x.s) : 'belum ada file pesanan';
        else if (g === 'Reseller') ket = x.s ? 'order terakhir ' + tgl(x.s) : 'belum ada order';
        else ket = x.s ? 'laporan terakhir ' + tgl(x.s) : 'belum ada laporan';
        var telat = x.s && B.berjalan && (new Date(B.sampai) - new Date(x.s)) / 864e5 >= 3 && g !== 'Reseller';
        var nm = g === 'Official' && x.n === 'Tokopedia' ? 'Tokopedia/TikTok' : x.n;
        h += '<div class="bx-r"' + (satu ? ' style="padding-left:0"' : '') + '><span class="n"' + (satu ? ' style="font-weight:800;color:var(--teks2);font-size:13px"' : '') + '>' + esc(nm) + '<small class="' + (telat || !x.s ? 'w' : '') + '">' + esc(ket) + '</small></span>' +
          '<span class="v">' + jt(x.v) + beda(x.v, x.l) + '</span><span class="bar"><i style="width:' + Math.max(x.v > 0 ? 1.5 : 0, x.v / mx * 100).toFixed(1) + '%"></i></span></div>';
      });
    });
    return h + '</div><p class="sb" style="margin:2px 0 0">Official dari file pesanan marketplace yang di-upload (tanpa pesanan batal, dikurangi retur). Consignment &amp; Toko Offline dari penjualan yang dilaporkan staf. Reseller dari order yang tidak batal.</p></div>';
  }

  function saldo(B, S) {
    var AK = {}; (S.akun || []).forEach(function (a) { AK[a.n] = a; });
    var h = '<div class="cd bh-kartu"><div class="bh-kp"><span class="bh-ik biru">' + IKN.dompet + '</span><div><h3>Saldo &amp; pengeluaran</h3><p>Saldo saat ini' + (S.diperbarui ? ' · diperbarui ' + esc(S.diperbarui) : '') + '</p></div></div>';
    var utama = {};
    (B.akun || []).forEach(function (k) {
      utama[k.n] = 1;
      var a = AK[k.n] || { v: 0 }, nK = k.jn != null ? k.jn : (k.list || []).filter(function (t) { return t.j === 'Keluar'; }).length;
      var ik = /tunai|kas/i.test(k.n) ? ['uang', 'biru'] : /shopee/i.test(k.n) ? ['tas', 'jingga'] : ['bank', 'biru'];
      h += '<details class="bx-akun"><summary><span class="bh-ik kcl ' + ik[1] + '">' + IKN[ik[0]] + '</span><span class="nm">' + esc(k.n) + '</span><span class="sd' + (a.v < 0 ? ' mn' : '') + '">' + rp(a.v) + '</span>' +
        '<span class="kl">Keluar ' + esc(rentang(B.dari, B.sampai)) + ': <b>' + rp(k.v) + '</b> · ' + nK + ' transaksi ' + beda(k.v, k.l, false) +
        (k.l > 0 ? '<br>Bulan lalu ' + esc(rentang(B.laluDari, B.laluSampai)) + ': ' + rp(k.l) : '') + '</span>' +
        '<span class="pa"><span class="t1">Lihat rincian ›</span><span class="t2">Tutup</span></span></summary><div class="isi">';
      if (!(k.list || []).length) h += '<div class="ksg" style="padding:12px 16px">Belum ada uang keluar dari akun ini di periode ini.</div>';
      (k.list || []).forEach(function (t) {
        var pindah = t.j === 'Pindah', oleh = String(t.o || '').replace(/^pemilik$/i, 'Manajemen').replace(/^[a-z ]+:\s*/i, '').replace(/\s*\(.*\)$/, '');
        h += '<div class="bx-tr' + (pindah ? ' p' : '') + '"><span class="t">' + esc(tgl(t.t)) + '</span><span>' + esc(t.ket || '-') +
          '<small>' + (pindah ? 'Pindah dana ke ' + esc(t.ke || '-') : esc(t.k || '-')) + ' · ' + esc(t.no) + (oleh ? ' · ' + esc(oleh) : '') + '</small></span>' +
          '<span class="v">' + (pindah ? '→ ' : '') + rp(t.v) + '</span></div>';
      });
      h += '</div></details>';
    });
    var lain = (S.akun || []).filter(function (a) { return !utama[a.n]; }), tl = 0;
    lain.forEach(function (a) { tl += a.v; });
    if (lain.length) {
      h += '<details class="bx-lain"><summary><span>Akun lain (' + lain.length + ')</span><span>' + jt(tl) + ' ›</span></summary>';
      lain.forEach(function (a) { h += '<div class="bx-r"><span class="n">' + esc(a.n) + '</span><span class="v">' + rp(a.v) + '</span></div>'; });
      h += '</details>';
    }
    return h + '</div>';
  }

  var el_po_buka = {};
  function po(B, f) {
    var dag = (B.po || []).map(function (p) { p.jenis = 'dagang'; return p; }), bb = (B.bb || []).map(function (p) { p.jenis = 'bahan'; return p; });
    var semua = dag.concat(bb), L = semua.filter(function (p) { return f === 'semua' || p.jenis === f; });
    var nilai = 0; L.forEach(function (p) { nilai += p.v; });
    var h = '<div class="cd bx-po bh-kartu" id="bxPo"><div class="bh-kp"><span class="bh-ik ungu">' + IKN.dok + '</span><div><h3>PO berjalan</h3><p>' + L.length + ' PO · ' + rp(nilai) + ' belum diterima</p></div></div>' +
      '<div class="bx-fl" role="group" aria-label="Saring PO">' +
      [['semua', 'Semua', semua.length], ['dagang', 'Barang dagang', dag.length], ['bahan', 'Bahan baku', bb.length]].map(function (x) {
        return '<button type="button" data-f="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + ' (' + x[2] + ')</button>';
      }).join('') + '</div>';
    var G = [['tunggu', 'Menunggu dibayar / diproses'], ['jalan', 'Sudah dibayar, belum diterima']];
    var ada = false;
    G.forEach(function (g) {
      var X = L.filter(function (p) { return p.grup === g[0]; }); if (!X.length) return; ada = true;
      var s = 0; X.forEach(function (p) { s += p.v; });
      h += '<div class="bx-pog"><h4>' + g[1] + ' <span>' + X.length + ' · ' + jt(s) + '</span></h4>';
      var semuaG = el_po_buka[g[0]], tampil = semuaG ? X : X.slice(0, 5);
      tampil.forEach(function (p) {
        var k = umurKelas(p);
        h += '<div class="bx-p"><div><div class="b"><span class="bx-tag">' + esc(p.jenis === 'bahan' ? 'Bahan baku' : p.asal) + '</span>' + esc(p.bar || '-') + '</div>' +
          '<div class="m">' + esc(p.no) + ' · ' + esc(tgl(p.tg)) + ' · ' + esc(p.sup || '-') + ' · ' + esc(p.st) + (p.resi ? ' · resi ' + esc(p.resi) : '') + '</div></div>' +
          '<div class="r"><b>' + rp(p.v) + '</b><span class="bx-um ' + k + '">' + p.umur + ' hari' + (k === 'm' ? ' · cek' : '') + '</span></div></div>';
      });
      if (X.length > tampil.length) h += '<button type="button" class="tbl kcl" data-semua="' + g[0] + '" style="margin-top:8px">Tampilkan semua (' + X.length + ')</button>';
      h += '</div>';
    });
    if (!ada) h += '<div class="ksg">' + (f === 'bahan' ? 'Tidak ada pembelian bahan baku yang sedang berjalan.' : 'Tidak ada PO yang sedang berjalan.') + '</div>';
    return h + '<p class="sb" style="margin:0">Tanda "cek": PO impor lebih dari 45 hari atau PO lokal lebih dari 7 hari belum ditandai diterima gudang.</p></div>';
  }

  // Ikon garis (24px) untuk kartu Beranda.
  function ik(d, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 22) + '" height="' + (w || 22) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  var IKN = {
    grafik: ik('M6 20V11M12 20V5M18 20v-6'), keranjang: ik('M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6M9 21h.01M18 21h.01'),
    kotak: ik('M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8'), dok: ik('M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6'),
    seru: ik('M12 7v6M12 17h.01', 26), dompet: ik('M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1zM4 7l11-3v3M16 13.5h2'),
    uang: ik('M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9v.01M18 15v.01', 20), bank: ik('M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18', 20),
    tas: ik('M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2', 20), toko: ik('M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6'),
    kalender: ik('M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', 18), lonceng: ik('M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4', 22), bawah: ik('m6 9 6 6 6-6', 16),
    naik: ik('M12 19V5M5 12l7-7 7 7', 15), turun: ik('M12 5v14M5 12l7 7 7-7', 15)
  };
  function delta(v, l, teksBanding) {
    if (!(l > 0)) return '<div class="bh-dl"><span class="sb">' + esc(teksBanding) + '</span></div>';
    var p = (v - l) / l * 100, naik = p >= 0;
    return '<div class="bh-dl"><b class="' + (Math.abs(p) < 0.5 ? '' : naik ? 'up' : 'dn') + '">' + (naik ? IKN.naik : IKN.turun) + (naik ? '+' : '−') + Math.abs(p).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%</b><span>dibandingkan ' + esc(teksBanding) + '</span></div>';
  }

  // el: wadah; B: hasil beranda_data; S: saldo (md:beranda); T: daftar tindakan [{teks, buka, w}];
  // opsi: {gantiBulan(m), buka(k), kpi (beranda_kpi), pengguna {nama, email}, menuAkun [{nm, k|href|klik}], ekor}
  function gambar(el, B, S, T, opsi) {
    pasangCss(); opsi = opsi || {};
    var f = el.getAttribute('data-f') || 'semua', K = opsi.kpi || {};
    var bulan = (B.bulanAda || []).slice(); if (bulan.indexOf(B.bulan) < 0) bulan.unshift(B.bulan);
    var lalu = namaBulan(B.laluDari).split(' '), laluPendek = BLS[BLN.indexOf(lalu[0])] + ' ' + lalu[1];
    var pilihBulan = function (id) {
      return '<label class="bh-bln"><span style="position:absolute;left:-9999px">Pilih bulan</span>' + IKN.kalender + '<select id="' + id + '">' +
        bulan.map(function (m) { return '<option value="' + esc(m) + '"' + (m === B.bulan ? ' selected' : '') + '>' + esc(namaBulan(m)) + '</option>'; }).join('') + '</select>' + IKN.bawah + '</label>';
    };
    // Kepala halaman
    var U = opsi.pengguna || {}, nm = String(U.nama || U.email || 'Manajemen'), ini = nm.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('') || 'M';
    var nT = (T || []).filter(function (t) { return t.w; }).length + ((B.po || []).some(function (p) { return umurKelas(p) === 'm'; }) ? 1 : 0);
    var h = '<div class="bh-head"><div class="bh-jd"><div class="bh-bc">Moscow Supplies <span>/</span> Ringkasan</div><h1>Beranda</h1><p>Ringkasan aktivitas, penjualan, persediaan dan keuangan perusahaan.</p></div>' +
      '<div class="bh-kn">' + pilihBulan('bxBulan') +
      '<button type="button" class="bh-bel" data-gulir="bxPerhatian" aria-label="' + nT + ' hal perlu perhatian" title="Perlu perhatian">' + IKN.lonceng + (nT ? '<i>' + nT + '</i>' : '') + '</button>' +
      '<div class="bh-av"><button type="button" id="bhAv" aria-haspopup="true" aria-expanded="false"><span class="in">' + esc(ini) + '</span><span class="nm">' + esc(nm.split(' ')[0]) + '<small>Manajemen</small></span>' + IKN.bawah + '</button>' +
      '<div class="bh-menu" id="bhMenu" hidden>' + (U.email ? '<div class="em">' + esc(U.email) + '</div>' : '') +
      (opsi.menuAkun || []).map(function (a, i) { return a.href ? '<a href="' + esc(a.href) + '">' + esc(a.nm) + '</a>' : '<button type="button" data-ma="' + i + '">' + esc(a.nm) + '</button>'; }).join('') + '</div></div></div></div>';

    // Kartu angka
    var O = B.omzet || [], tot = 0, totL = 0; O.forEach(function (x) { tot += x.v; totL += x.l; });
    var ps = K.psn || null, st = K.stok || null;
    var semuaPo = (B.po || []).concat(B.bb || []), lewat = semuaPo.filter(function (p) { return umurKelas(p) === 'm'; }).length;
    h += '<div class="bh-kpi">' +
      '<button type="button" class="bh-k" data-gulir="bxRinci"><span class="bh-ik bulat biru">' + IKN.grafik + '</span><span class="tx"><span class="l">Omzet</span><b>' + jt(tot) + '</b></span>' + delta(tot, totL, totL > 0 ? laluPendek : laluPendek + ' belum tercatat') + '</button>' +
      '<button type="button" class="bh-k hijau" data-buka="jual"><span class="bh-ik bulat hijau">' + IKN.keranjang + '</span><span class="tx"><span class="l">Pesanan</span><b>' + (ps ? fmt(ps.v) : '…') + '</b></span>' +
        (ps ? (ps.l > 0 ? delta(ps.v, ps.l, laluPendek) : '<div class="bh-dl"><span class="sb">Official ' + fmt(ps.off) + ' · Toko ' + fmt(ps.offl) + ' · Reseller ' + fmt(ps.res) + '</span></div>') : '') + '</button>' +
      '<a class="bh-k jingga" href="stok.html"><span class="bh-ik bulat jingga">' + IKN.kotak + '</span><span class="tx"><span class="l">Stok menipis</span><b>' + (st ? fmt(st.n) + ' produk' : '…') + '</b></span>' +
        (st ? '<div class="bh-dl"><span class="sb">Stok online ≤ ' + st.batas + ' pcs' + (st.minus ? ' · <b class="dn">' + fmt(st.minus) + ' minus</b>' : '') + '</span></div>' : '') + '</a>' +
      '<button type="button" class="bh-k ungu" data-buka="purch"><span class="bh-ik bulat ungu">' + IKN.dok + '</span><span class="tx"><span class="l">Perlu ditinjau</span><b>' + fmt(semuaPo.length) + ' PO</b></span>' +
        '<div class="bh-dl"><span class="sb">Menunggu verifikasi &amp; penerimaan' + (lewat ? ' · <b class="dn">' + lewat + ' lewat batas</b>' : '') + '</span></div></button>' +
      '</div>';

    // Perlu perhatian
    var chip = '';
    (T || []).forEach(function (t) { chip += '<button type="button" class="' + (t.w ? '' : 'n') + '" data-buka="' + esc(t.buka) + '">' + esc(t.teks) + ' ›</button>'; });
    if (lewat) chip += '<button type="button" data-gulir="bxPo">' + lewat + ' PO melewati batas penerimaan ›</button>';
    h += chip ? '<div class="bh-awas" id="bxPerhatian"><span class="bh-ik bulat kuning">' + IKN.seru + '</span><div class="tx"><b>Perlu perhatian</b><span>Beberapa aktivitas memerlukan tindak lanjut.</span></div><div class="ch">' + chip + '</div></div>'
      : '<div class="bh-awas ok" id="bxPerhatian"><span class="bh-ik bulat hijau">' + ik('M20 6 9 17l-5-5', 24) + '</span><div class="tx"><b>Semua aman</b><span>Tidak ada yang perlu ditindaklanjuti saat ini.</span></div></div>';

    h += '<div class="bx-grid">' + grafik(B, pilihBulan) + saldo(B, S || {}) + omzet(B) + po(B, f) + '</div>';
    if (opsi.ekor) h += opsi.ekor;
    if (opsi.aksi && opsi.aksi.length) h += '<div class="bh-pintas"><span class="sb">Pintasan:</span>' + opsi.aksi.map(function (x) { return x.k ? '<button type="button" class="tbl" data-buka="' + esc(x.k) + '">' + esc(x.nm) + '</button>' : '<a class="tbl" href="' + esc(x.href) + '">' + esc(x.nm) + '</a>'; }).join('') + '</div>';
    el.innerHTML = h;
    pasangTip(el, B);
    el.querySelectorAll('#bxBulan,#bxBulan2').forEach(function (sel) { sel.onchange = function () { if (opsi.gantiBulan) opsi.gantiBulan(this.value); }; });
    el.querySelectorAll('.bx-fl button').forEach(function (b) { b.onclick = function () { el.setAttribute('data-f', b.getAttribute('data-f')); gambar(el, B, S, T, opsi); }; });
    el.querySelectorAll('[data-semua]').forEach(function (b) { b.onclick = function () { el_po_buka[b.getAttribute('data-semua')] = true; gambar(el, B, S, T, opsi); var t = document.getElementById('bxPo'); if (t) t.scrollIntoView({ block: 'start' }); }; });
    el.querySelectorAll('[data-buka]').forEach(function (b) { b.onclick = function () { if (opsi.buka) opsi.buka(b.getAttribute('data-buka')); }; });
    el.querySelectorAll('[data-gulir]').forEach(function (b) { b.onclick = function () { var t = document.getElementById(b.getAttribute('data-gulir')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    var av = el.querySelector('#bhAv'), mn = el.querySelector('#bhMenu');
    if (av) {
      av.onclick = function (e) { e.stopPropagation(); mn.hidden = !mn.hidden; av.setAttribute('aria-expanded', String(!mn.hidden)); };
      document.addEventListener('click', function tutup(e) { if (!mn.isConnected) { document.removeEventListener('click', tutup); return; } if (!mn.contains(e.target)) { mn.hidden = true; av.setAttribute('aria-expanded', 'false'); } });
      mn.querySelectorAll('[data-ma]').forEach(function (b) { b.onclick = function () { mn.hidden = true; var a = opsi.menuAkun[+b.getAttribute('data-ma')]; if (a.k && opsi.buka) opsi.buka(a.k); else if (a.klik) a.klik(); }; });
    }
  }

  window.BerandaBaru = { gambar: gambar };
})();
