const translations = {
  en: {
    nav_home: "Public Explorer",
    nav_manual: "User Manual",
    nav_login: "Sign In",
    nav_register: "Enroll Entity",
    nav_settings: "Settings",
    search_heading: "Find Active Public Works in Your Locality",
    state: "State",
    district: "District",
    taluk: "Taluk",
    village: "Village / Ward",
    search_btn: "Search Works",
    tender_contractor: "Executing Contractor:",
    budget: "Sanctioned Budget",
    download_doc: "Download Contract File"
  },
  hi: {
    nav_home: "सार्वजनिक अन्वेषक",
    nav_manual: "उपयोगकर्ता नियमावली",
    nav_login: "साइन इन करें",
    nav_register: "संस्था पंजीकृत करें",
    nav_settings: "सेटिंग्स",
    search_heading: "अपने इलाके में सक्रिय सरकारी विकास कार्यों की खोज करें",
    state: "राज्य",
    district: "ज़िला",
    taluk: "तालुका",
    village: "गाँव / वार्ड",
    search_btn: "कार्य खोजें",
    tender_contractor: "कार्यकारी ठेकेदार:",
    budget: "स्वीकृत बजट",
    download_doc: "अनुबंध दस्तावेज़ डाउनलोड करें"
  },
  kn: {
    nav_home: "ಸಾರ್ವಜನಿಕ ಪರಿಶೋಧಕ",
    nav_manual: "ಬಳಕೆದಾರರ ಕೈಪಿಡಿ",
    nav_login: "ಸೈನ್ ಇನ್",
    nav_register: "ಸಂಸ್ಥೆ ನೋಂದಣಿ",
    nav_settings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
    search_heading: "ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ನಡೆಯುತ್ತಿರುವ ಕಾಮಗಾರಿಗಳನ್ನು ಹುಡುಕಿ",
    state: "ರಾಜ್ಯ",
    district: "ಜಿಲ್ಲೆ",
    taluk: "ತಾಲೂಕು",
    village: "ಗ್ರಾಮ / ವಾರ್ಡ್",
    search_btn: "ಹುಡುಕಿ",
    tender_contractor: "ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿರುವ ಗುತ್ತಿಗೆದಾರರು:",
    budget: "ಮಂಜೂರಾದ ಮೊತ್ತ",
    download_doc: "ಒಪ್ಪಂದದ ಕಡತ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ"
  },
  ta: {
    nav_home: "பொது தளம்",
    nav_manual: "பயனர் கையேடு",
    nav_login: "உள்நுழைவு",
    nav_register: "பதிவு செய்க",
    nav_settings: "அமைப்புகள்",
    search_heading: "உங்கள் பகுதியில் செயல்படும் அரசு திட்டங்களை அறியவும்",
    state: "மாநிலம்",
    district: "மாவட்டம்",
    taluk: "வட்டம்",
    village: "கிராமம் / வார்டு",
    search_btn: "தேடுக",
    tender_contractor: "செயல்படுத்தும் ஒப்பந்ததாரர்:",
    budget: "ஒதுக்கப்பட்ட நிதி",
    download_doc: "ஒப்பந்த கோப்பைப் பதிவிறக்குக"
  }
};

function changeLanguage(lang) {
  localStorage.setItem('govprocure_lang', lang);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.innerText = translations[lang][key];
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('govprocure_lang') || 'en';
  const selector = document.getElementById('langSelect');
  if (selector) selector.value = savedLang;
  changeLanguage(savedLang);
});
