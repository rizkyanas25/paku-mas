const API_URL =
  'https://script.google.com/macros/s/AKfycbzV1MScsmtfwuca8VPUFECENlqNpkS4Ux_cEuLrQDDArJPjoWMrb4dNE2tcbrvl_rcM/exec';

const metodeSelect = document.getElementById('metodeDonasi');
const rekeningBox = document.getElementById('rekeningBox');
const qrisBox = document.getElementById('qrisBox');
const tipeRadios = document.querySelectorAll("input[name='tipeDonasi']");
const jangkaWaktuWrapper = document.getElementById('jangkaWaktuWrapper');
const uploadWrapper = document.getElementById('uploadWrapper');
const buktiInput = document.getElementById('buktiTransfer');
const dropZone = document.getElementById('dropZone');
const fileName = document.getElementById('file-name');
const previewWrapper = document.getElementById('previewWrapper');
const previewImage = document.getElementById('previewImage');
const submitBtn = document.getElementById('submitBtn');
const rechooseFileBtn = document.getElementById('rechooseFileBtn');
const form = document.getElementById('donasiForm');
const formTitle = document.getElementById('formTitle');
const formInstruction = document.getElementById('formInstruction');
const backButton = document.getElementById('backButton');
const successSection = document.getElementById('successSection');
const sertifikatNoSpan = document.getElementById('sertifikatNo');
const kwitansiNoSpan = document.getElementById('kwitansiNo');
const alertModal = document.getElementById('alertModal');
const alertMessage = document.getElementById('alertMessage');
const closeAlertBtn = document.getElementById('closeAlertBtn');
const nomorHPInput = document.getElementById('nomorHP');
const nomorHPError = document.getElementById('nomorHPError');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const namaInput = document.getElementById('nama');
const namaError = document.getElementById('namaError');
const jumlahDonasiInput = document.getElementById('jumlahDonasi');
const jumlahDonasiError = document.getElementById('jumlahDonasiError');

let tipeDonasi = 'Tidak Tetap';
let metodeDonasi = '';
let isFormDirty = false;
let isLoading = false;
let spinnerInterval = null;

const loadingTexts = [
  '📦 Mengirim data donasi',
  '🧾 Membuat kwitansi',
  '📜 Membuat sertifikat',
  '💌 Mengirim ke WhatsApp & Email',
  '✅ Hampir selesai',
];

// === Default button text saat halaman load ===
window.addEventListener('DOMContentLoaded', () => {
  submitBtn.innerHTML = `
    <i class="fas fa-hand-holding-heart mr-2"></i>
    <span>Lanjutkan Donasi</span>
  `;
});

function markFormDirty() {
  isFormDirty = true;
}
form.addEventListener('input', markFormDirty);
form.addEventListener('change', markFormDirty);

window.addEventListener('beforeunload', function (e) {
  if (isFormDirty || isLoading) {
    e.preventDefault();
    e.returnValue =
      'Anda memiliki perubahan yang belum disimpan atau sedang mengirim data. Yakin ingin keluar?';
    return e.returnValue;
  }
});

backButton.addEventListener('click', function (e) {
  if (isFormDirty || isLoading) {
    e.preventDefault();
    if (
      confirm(
        'Anda memiliki perubahan yang belum disimpan atau sedang mengirim data. Yakin ingin keluar?'
      )
    ) {
      isFormDirty = false;
      isLoading = false;
      window.location.href = '/';
    }
  }
});

function validateNomorHP(nomor) {
  const cleaned = nomor.replace(/\D/g, '');
  if (!cleaned.startsWith('0')) {
    return { valid: false, message: 'Nomor HP harus dimulai dengan 0' };
  }
  if (cleaned.length < 11 || cleaned.length > 14) {
    return { valid: false, message: 'Nomor HP harus 10–13 digit' };
  }
  return { valid: true };
}

function validateEmail(email) {
  const trimmed = email.trim();
  if (trimmed === '') return { valid: true };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Format email tidak valid' };
  }
  return { valid: true };
}

function validateNama(nama) {
  const trimmed = nama.trim();
  if (trimmed === '')
    return { valid: false, message: 'Nama tidak boleh kosong' };
  if (trimmed.length < 2)
    return { valid: false, message: 'Nama minimal 2 karakter' };
  return { valid: true };
}

function validateJumlahDonasi(jumlah) {
  const cleaned = jumlah.replace(/\./g, '').trim();
  if (cleaned === '')
    return { valid: false, message: 'Jumlah tidak boleh kosong' };
  if (!/^\d+$/.test(cleaned))
    return { valid: false, message: 'Hanya boleh angka' };
  const val = Number(cleaned);
  if (isNaN(val) || val <= 0)
    return { valid: false, message: 'Jumlah harus lebih dari 0' };
  return { valid: true };
}

function showAlert(message) {
  alertMessage.textContent = message;
  alertModal.classList.remove('hidden');
}
closeAlertBtn.addEventListener('click', () =>
  alertModal.classList.add('hidden')
);

metodeSelect.addEventListener('change', function () {
  metodeDonasi = this.value;
  rekeningBox.classList.add('hidden');
  qrisBox.classList.add('hidden');
  uploadWrapper.classList.add('hidden');
  resetUpload();
  if (this.value === 'Transfer') {
    rekeningBox.classList.remove('hidden');
    uploadWrapper.classList.remove('hidden');
  }
  if (this.value === 'QRIS') {
    qrisBox.classList.remove('hidden');
    uploadWrapper.classList.remove('hidden');
  }
});

tipeRadios.forEach((radio) => {
  radio.addEventListener('change', function () {
    tipeDonasi = this.value;
    jangkaWaktuWrapper.classList.toggle('hidden', this.value !== 'Tetap');
  });
});

dropZone.addEventListener('click', () => buktiInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('bg-green-100', 'border-green-500');
});
dropZone.addEventListener('dragleave', () =>
  dropZone.classList.remove('bg-green-100', 'border-green-500')
);
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    buktiInput.files = dt.files;
    handleFile(file);
  }
});

buktiInput.addEventListener('change', () => handleFile(buktiInput.files[0]));
rechooseFileBtn.addEventListener('click', () => {
  buktiInput.value = '';
  buktiInput.click();
});

function handleFile(file) {
  if (!file) return;
  fileName.textContent = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    previewWrapper.classList.remove('hidden');
    rechooseFileBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  fileName.textContent = 'Belum ada file dipilih';
  previewWrapper.classList.add('hidden');
  previewImage.src = '';
  rechooseFileBtn.classList.add('hidden');
}

// === SUBMIT HANDLER ===
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const validations = [
    validateNama(namaInput.value.trim()),
    validateNomorHP(nomorHPInput.value.trim()),
    validateJumlahDonasi(jumlahDonasiInput.value.trim()),
    validateEmail(emailInput.value.trim()),
  ];

  if (!validations.every((v) => v.valid)) {
    const invalid = validations.find((v) => !v.valid);
    showAlert(invalid.message);
    return;
  }

  if (!metodeDonasi) {
    showAlert('Pilih metode donasi terlebih dahulu.');
    return;
  }

  const file = buktiInput.files[0];
  if ((metodeDonasi === 'Transfer' || metodeDonasi === 'QRIS') && !file) {
    showAlert('Upload bukti transfer dulu ya 🙏');
    return;
  }

  const cleanedHP = nomorHPInput.value.replace(/\D/g, '');
  const data = {
    nama: namaInput.value,
    nomorHP: '62' + cleanedHP.substring(1),
    email: emailInput.value,
    jumlahDonasi: Number(jumlahDonasiInput.value.replace(/\./g, '')),
    tipeDonasi,
    jangkaWaktu: form.jangkaWaktu?.value || '',
    metodeDonasi,
  };

  isLoading = true;
  submitBtn.disabled = true;
  backButton.style.pointerEvents = 'none';
  backButton.style.opacity = '0.5';

  // === Setup spinner & text ===
  submitBtn.innerHTML = '';
  const spinnerText = document.createElement('span');
  spinnerText.className =
    'text-sm font-medium transition-opacity duration-500 ease-in-out';
  spinnerText.style.opacity = '1';
  spinnerText.textContent = loadingTexts[0];

  const spinnerIcon = document.createElement('i');
  spinnerIcon.className = 'fas fa-spinner fa-spin ml-2';

  submitBtn.appendChild(spinnerText);
  submitBtn.appendChild(spinnerIcon);

  let i = 1;
  spinnerInterval = setInterval(() => {
    if (i < loadingTexts.length) {
      // animasi fade out dulu
      spinnerText.style.opacity = '0';
      setTimeout(() => {
        spinnerText.textContent = loadingTexts[i];
        spinnerText.style.opacity = '1'; // fade in balik
        i++;
      }, 400); // jeda fade out sebelum ganti text
    } else {
      clearInterval(spinnerInterval);
    }
  }, 1800);

  if (file) {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      data.buktiTransfer = {
        name: file.name,
        type: file.type,
        base64: evt.target.result.split(',')[1],
      };
      await sendData(data);
    };
    reader.readAsDataURL(file);
  } else {
    await sendData(data);
  }
});

async function sendData(data) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = await res.json();

    clearInterval(spinnerInterval);
    submitBtn.innerHTML = `
      <i class="fas fa-hand-holding-heart mr-2"></i>
      <span>Lanjutkan Donasi</span>
    `;
    submitBtn.disabled = false;
    isLoading = false;
    backButton.style.pointerEvents = '';
    backButton.style.opacity = '';

    if (json.status === 'success') {
      isFormDirty = false;
      form.classList.add('hidden');
      formTitle.classList.add('hidden');
      formInstruction.classList.add('hidden');
      backButton.classList.add('hidden');
      successSection.classList.remove('hidden');
      sertifikatNoSpan.textContent = json.id;
      kwitansiNoSpan.textContent = json.kwitansiNo;
    } else {
      showAlert('Gagal: ' + json.message);
    }
  } catch (err) {
    clearInterval(spinnerInterval);
    submitBtn.innerHTML = `
      <i class="fas fa-hand-holding-heart mr-2"></i>
      <span>Lanjutkan Donasi</span>
    `;
    submitBtn.disabled = false;
    isLoading = false;
    backButton.style.pointerEvents = '';
    backButton.style.opacity = '';
    showAlert('Terjadi kesalahan: ' + err.message);
  }
}

document.getElementById('donasiLagiBtn').addEventListener('click', () => {
  successSection.classList.add('hidden');
  form.classList.remove('hidden');
  formTitle.classList.remove('hidden');
  formInstruction.classList.remove('hidden');
  backButton.classList.remove('hidden');
  backButton.style.pointerEvents = '';
  backButton.style.opacity = '';
  isFormDirty = false;
  form.reset();
  resetUpload();
  metodeDonasi = '';
  rekeningBox.classList.add('hidden');
  qrisBox.classList.add('hidden');
  uploadWrapper.classList.add('hidden');
  tipeDonasi = 'Tidak Tetap';
  jangkaWaktuWrapper.classList.add('hidden');
});
