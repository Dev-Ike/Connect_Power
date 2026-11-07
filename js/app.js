// Connect Power - site code. Supabase calls are in ./backend.js and keys in ./config.js
let B = null;
try { B = await import('./backend.js'); } catch (err) { console.error('The backend could not be loaded', err); }
if (!B) {
  const base = {
    configured: false, onAuth: function (cb) { setTimeout(function () { cb(null); }, 0); return function () { }; },
    pendingSignUp: function () { return Promise.resolve(); }, signOut: function () { return Promise.resolve(); },
    onRecovery: function () { }, takeResume: function () { return false; }, markResume: function () { }
  };
  B = new Proxy(base, { get: function (t, k) { return k in t ? t[k] : function () { const e = new Error('Supabase is not configured'); e.code = 'app/not-configured'; return Promise.reject(e); }; } });
}

(function () {
  var STEPS = ['Personal details', 'Education and Qualification', 'Programme Track', 'Review', 'Document Upload', 'Payment'], store = {};
  function stepper(n) { return '<ol class="stp" aria-label="Application progress">' + STEPS.map(function (t, i) { var c = i + 1 < n ? 'done' : i + 1 === n ? 'cur' : ''; return '<li class="' + c + '"' + (c === 'cur' ? ' aria-current="step"' : '') + '><i>' + (c === 'done' ? '✓' : i + 1) + '</i><span>' + t + '</span></li>' }).join('') + '</ol><p class="stl">Step ' + n + ' of ' + STEPS.length + ': ' + STEPS[n - 1] + '</p>' }
  for (var si = 1; si <= STEPS.length; si++)document.getElementById('stp' + si).innerHTML = stepper(si);
  var pages = ['home', 'about', 'news', 'signin', 'signup', 'reset', 'step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'slip'];
  function route() {
    var h = (location.hash || "#home").slice(1); if (h === "login") h = "signin"; if (pages.indexOf(h) < 0) h = "home";
    var gd = guard(h); if (gd) { h = gd.slice(1); if (location.hash !== gd) location.replace(gd) }
    pages.forEach(function (p) { document.getElementById(p).classList.toggle("on", p === h) });
    document.querySelectorAll("nav a").forEach(function (a) { if (a.dataset.p === h) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current") });
    document.title = ({ signin: "Login", signup: "Sign up", reset: "New password", slip: "Application slip" }[h] || (/^step\d$/.test(h) ? STEPS[+h.slice(4) - 1] : h.charAt(0).toUpperCase() + h.slice(1))) + " – Connect Power"; window.scrollTo(0, 0)
  }
  var mb = document.getElementById("mb"), nv = document.getElementById("nv"); mb.addEventListener("click", function () { var o = nv.classList.toggle("open"); mb.setAttribute("aria-expanded", o) }); window.addEventListener("hashchange", function () { nv.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); route() }); route();
  var T = new Date("2026-11-30T23:59:59+01:00").getTime();   // application deadline (30 November 2026, 11:59 PM WAT)
  function z(n) { return String(n).padStart(2, "0") }
  function tick() {
    var l = T - Date.now(); if (l <= 0) { ["d", "h", "m", "s"].forEach(function (i) { document.getElementById(i).textContent = "00" }); document.getElementById("when").textContent = "Applications closed on 30 November 2026."; document.querySelector(".hero h1").textContent = "Applications have closed"; return }
    var s = Math.floor(l / 1000); document.getElementById("d").textContent = z(Math.floor(s / 86400)); document.getElementById("h").textContent = z(Math.floor(s % 86400 / 3600)); document.getElementById("m").textContent = z(Math.floor(s % 3600 / 60)); document.getElementById("s").textContent = z(s % 60)
  }
  tick(); setInterval(tick, 1000);
  function $(i) { return document.getElementById(i) }
  var NG = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
  $("su-s").innerHTML = '<option value="">Select your state</option>' + NG.map(function (n) { return "<option>" + n + "</option>" }).join("");
  function bad(id, msg) { var i = $(id), t = $(id + "-t"); if (msg) { i.classList.add("bad"); i.setAttribute("aria-invalid", "true"); t.textContent = msg; t.style.display = "block" } else { i.classList.remove("bad"); i.removeAttribute("aria-invalid"); t.style.display = "none" } return !msg }
  document.querySelectorAll(".auth input,.auth select").forEach(function (el) { var f = function () { if ($(el.id + "-t")) bad(el.id, "") }; el.addEventListener("input", f); el.addEventListener("change", f) });
  document.querySelectorAll("[data-show]").forEach(function (b) { b.addEventListener("click", function () { var i = $(b.dataset.show), h = i.type === "password"; i.type = h ? "text" : "password"; b.textContent = h ? "Hide" : "Show"; b.setAttribute("aria-label", h ? "Hide password" : "Show password") }) });
  $("su-p").addEventListener("input", function () { var v = this.value, s = (v.length >= 8) + /[A-Z]/.test(v) + /\d/.test(v) + /[^A-Za-z0-9]/.test(v), c = ["#C0392B", "#C0392B", "#E08A1E", "#7BB241", "#0B7A43"]; if (!v) s = 0; $("su-mi").style.width = s * 25 + "%"; $("su-mi").style.background = c[s]; $("su-ph").textContent = v ? ["", "Weak", "Fair", "Good", "Strong"][s] + " password" : "Use at least 8 characters with letters and numbers." });
  var AM = { 'auth/email-already-in-use': 'An account with this email already exists. Log in instead.', 'auth/invalid-credential': 'Incorrect email or password.', 'auth/wrong-password': 'Incorrect email or password.', 'auth/user-not-found': 'Incorrect email or password.', 'auth/invalid-email': 'Enter a valid email address.', 'auth/user-disabled': 'This account has been disabled. Please contact support.', 'auth/too-many-requests': 'Too many attempts. Wait a few minutes or reset your password.', 'auth/network-request-failed': 'Network error. Check your connection and try again.', 'auth/weak-password': 'Choose a stronger password of at least 8 characters.', 'auth/operation-not-allowed': 'This login method is not turned on yet.', 'auth/unauthorized-domain': 'This website address is not authorised for login yet.', 'app/not-configured': 'The site is not connected to Supabase yet. Add your Supabase keys in js/config.js.', 'auth/email-not-confirmed': 'Please confirm your email first. Open the link we sent to your inbox, then log in.', 'auth/same-password': 'Choose a password different from your current one.', 'auth/session-missing': 'This reset link has expired or was already used. Request a new one from the login page.' };
  function authMsg(e) { var c = (e && e.code) || ''; return c in AM ? AM[c] : 'Something went wrong. Please try again.' }
  function showErr(m, e) { var t = authMsg(e); m.className = t ? 'msg err' : 'msg'; m.textContent = t }
  function busy(b, on, txt) { if (!b) return; if (on) { b.dataset.lbl = b.innerHTML; b.textContent = txt; b.disabled = true } else { if (b.dataset.lbl) b.innerHTML = b.dataset.lbl; b.disabled = false } }
  function run(c) { var first = null; c.forEach(function (x) { if (!bad(x[0], x[1]) && !first) first = x[0] }); if (first) { $(first).focus(); return false } return true }
  $("sif").addEventListener("submit", async function (ev) {
    ev.preventDefault(); var m = $("si-m"), b = this.querySelector('button[type=submit]'); m.className = "msg";
    if (!run([["si-e", /^\S+@\S+\.\S+$/.test($("si-e").value.trim()) ? "" : "Enter a valid email address."], ["si-p", $("si-p").value ? "" : "Enter your password."]])) return;
    busy(b, true, "Logging in...");
    try { await B.signIn($("si-e").value.trim(), $("si-p").value) } catch (e) { showErr(m, e) } finally { busy(b, false) }
  });
  $("suf").addEventListener("submit", async function (ev) {
    ev.preventDefault(); var m = $("su-m"), b = this.querySelector('button[type=submit]'), p = $("su-p").value; m.className = "msg";
    if (!run([["su-f", $("su-f").value.trim() ? "" : "Enter your first name."], ["su-l", $("su-l").value.trim() ? "" : "Enter your last name."], ["su-e", /^\S+@\S+\.\S+$/.test($("su-e").value.trim()) ? "" : "Enter a valid email address."], ["su-n", /^(\+234|0)[789][01]\d{8}$/.test($("su-n").value.replace(/[\s-]/g, "")) ? "" : "Enter a valid Nigerian number, for example 0803 123 4567."], ["su-s", $("su-s").value ? "" : "Select your state."], ["su-p", p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p) ? "" : "Use at least 8 characters with letters and numbers."], ["su-c", p && $("su-c").value === p ? "" : "The passwords do not match."], ["su-t", $("su-t").checked ? "" : "Tick this box to continue."]])) return;
    busy(b, true, "Creating your account...");
    try { var sr = await B.signUp({ email: $("su-e").value.trim(), password: p, first: $("su-f").value.trim(), last: $("su-l").value.trim(), phone: $("su-n").value.replace(/[\s-]/g, ""), state: $("su-s").value }); if (sr && sr.needsConfirmation) { m.className = "msg ok"; m.textContent = "Account created. We sent a confirmation link to " + $("su-e").value.trim() + ". Open it to confirm your email and you will be taken to your application." } } catch (e) { showErr(m, e) } finally { busy(b, false) }
  });
  $("si-fp").addEventListener("click", async function () {
    var m = $("si-m"), e = $("si-e").value.trim(); m.className = "msg";
    if (!bad("si-e", /^\S+@\S+\.\S+$/.test(e) ? "" : "Enter your email address first, then choose Forgot your password.")) { $("si-e").focus(); return }
    try { await B.resetPassword(e); m.className = "msg ok"; m.textContent = "If an account exists for " + e + ", we have sent a password reset link. Check your inbox and spam folder." }
    catch (x) { if (x && x.code === "auth/user-not-found") { m.className = "msg ok"; m.textContent = "If an account exists for " + e + ", we have sent a password reset link. Check your inbox and spam folder." } else showErr(m, x) }
  });
  var L = { 'Abia': 'Aba North|Aba South|Arochukwu|Bende|Ikwuano|Isiala Ngwa North|Isiala Ngwa South|Isuikwuato|Obi Ngwa|Ohafia|Osisioma|Ugwunagbo|Ukwa East|Ukwa West|Umuahia North|Umuahia South|Umu Nneochi', 'Adamawa': 'Demsa|Fufure|Ganye|Gayuk|Gombi|Grie|Hong|Jada|Lamurde|Madagali|Maiha|Mayo Belwa|Michika|Mubi North|Mubi South|Numan|Shelleng|Song|Toungo|Yola North|Yola South', 'Akwa Ibom': 'Abak|Eastern Obolo|Eket|Esit Eket|Essien Udim|Etim Ekpo|Etinan|Ibeno|Ibesikpo Asutan|Ibiono-Ibom|Ika|Ikono|Ikot Abasi|Ikot Ekpene|Ini|Itu|Mbo|Mkpat-Enin|Nsit-Atai|Nsit-Ibom|Nsit-Ubium|Obot Akara|Okobo|Onna|Oron|Oruk Anam|Udung-Uko|Ukanafun|Uruan|Urue-Offong/Oruko|Uyo', 'Anambra': 'Aguata|Anambra East|Anambra West|Anaocha|Awka North|Awka South|Ayamelum|Dunukofia|Ekwusigo|Idemili North|Idemili South|Ihiala|Njikoka|Nnewi North|Nnewi South|Ogbaru|Onitsha North|Onitsha South|Orumba North|Orumba South|Oyi', 'Bauchi': 'Alkaleri|Bauchi|Bogoro|Damban|Darazo|Dass|Gamawa|Ganjuwa|Giade|Itas/Gadau|Jama’are|Katagum|Kirfi|Misau|Ningi|Shira|Tafawa Balewa|Toro|Warji|Zaki', 'Bayelsa': 'Brass|Ekeremor|Kolokuma/Opokuma|Nembe|Ogbia|Sagbama|Southern Ijaw|Yenagoa', 'Benue': 'Ado|Agatu|Apa|Buruku|Gboko|Guma|Gwer East|Gwer West|Katsina-Ala|Konshisha|Kwande|Logo|Makurdi|Obi|Ogbadibo|Ohimini|Oju|Okpokwu|Otukpo|Tarka|Ukum|Ushongo|Vandeikya', 'Borno': 'Abadam|Askira/Uba|Bama|Bayo|Biu|Chibok|Damboa|Dikwa|Gubio|Guzamala|Gwoza|Hawul|Jere|Kaga|Kala/Balge|Konduga|Kukawa|Kwaya Kusar|Mafa|Magumeri|Maiduguri|Marte|Mobbar|Monguno|Ngala|Nganzai|Shani', 'Cross River': 'Abi|Akamkpa|Akpabuyo|Bakassi|Bekwarra|Biase|Boki|Calabar Municipal|Calabar South|Etung|Ikom|Obanliku|Obubra|Obudu|Odukpani|Ogoja|Yakuur|Yala', 'Delta': 'Aniocha North|Aniocha South|Bomadi|Burutu|Ethiope East|Ethiope West|Ika North East|Ika South|Isoko North|Isoko South|Ndokwa East|Ndokwa West|Okpe|Oshimili North|Oshimili South|Patani|Sapele|Udu|Ughelli North|Ughelli South|Ukwuani|Uvwie|Warri North|Warri South|Warri South West', 'Ebonyi': 'Abakaliki|Afikpo North|Afikpo South|Ebonyi|Ezza North|Ezza South|Ikwo|Ishielu|Ivo|Izzi|Ohaozara|Ohaukwu|Onicha', 'Edo': 'Akoko-Edo|Egor|Esan Central|Esan North-East|Esan South-East|Esan West|Etsako Central|Etsako East|Etsako West|Igueben|Ikpoba Okha|Orhionmwon|Oredo|Ovia North-East|Ovia South-West|Owan East|Owan West|Uhunmwonde', 'Ekiti': 'Ado Ekiti|Efon|Ekiti East|Ekiti South-West|Ekiti West|Emure|Gbonyin|Ido Osi|Ijero|Ikere|Ikole|Ilejemeje|Irepodun/Ifelodun|Ise/Orun|Moba|Oye', 'Enugu': 'Aninri|Awgu|Enugu East|Enugu North|Enugu South|Ezeagu|Igbo Etiti|Igbo Eze North|Igbo Eze South|Isi Uzo|Nkanu East|Nkanu West|Nsukka|Oji River|Udenu|Udi|Uzo Uwani', 'FCT Abuja': 'Abaji|Bwari|Gwagwalada|Kuje|Kwali|Municipal Area Council', 'Gombe': 'Akko|Balanga|Billiri|Dukku|Funakaye|Gombe|Kaltungo|Kwami|Nafada|Shongom|Yamaltu/Deba', 'Imo': 'Aboh Mbaise|Ahiazu Mbaise|Ehime Mbano|Ezinihitte|Ideato North|Ideato South|Ihitte/Uboma|Ikeduru|Isiala Mbano|Isu|Mbaitoli|Ngor Okpala|Njaba|Nkwerre|Nwangele|Obowo|Oguta|Ohaji/Egbema|Okigwe|Orlu|Orsu|Oru East|Oru West|Owerri Municipal|Owerri North|Owerri West|Unuimo', 'Jigawa': 'Auyo|Babura|Biriniwa|Birnin Kudu|Buji|Dutse|Gagarawa|Garki|Gumel|Guri|Gwaram|Gwiwa|Hadejia|Jahun|Kafin Hausa|Kaugama|Kazaure|Kiri Kasama|Kiyawa|Maigatari|Malam Madori|Miga|Ringim|Roni|Sule Tankarkar|Taura|Yankwashi', 'Kaduna': 'Birnin Gwari|Chikun|Giwa|Igabi|Ikara|Jaba|Jema’a|Kachia|Kaduna North|Kaduna South|Kagarko|Kajuru|Kaura|Kauru|Kubau|Kudan|Lere|Makarfi|Sabon Gari|Sanga|Soba|Zangon Kataf|Zaria', 'Kano': 'Ajingi|Albasu|Bagwai|Bebeji|Bichi|Bunkure|Dala|Dambatta|Dawakin Kudu|Dawakin Tofa|Doguwa|Fagge|Gabasawa|Garko|Garun Mallam|Gaya|Gezawa|Gwale|Gwarzo|Kabo|Kano Municipal|Karaye|Kibiya|Kiru|Kumbotso|Kunchi|Kura|Madobi|Makoda|Minjibir|Nasarawa|Rano|Rimin Gado|Rogo|Shanono|Sumaila|Takai|Tarauni|Tofa|Tsanyawa|Tudun Wada|Ungogo|Warawa|Wudil', 'Katsina': 'Bakori|Batagarawa|Batsari|Baure|Bindawa|Charanchi|Dandume|Danja|Dan Musa|Daura|Dutsi|Dutsin-Ma|Faskari|Funtua|Ingawa|Jibia|Kafur|Kaita|Kankara|Kankia|Katsina|Kurfi|Kusada|Mai’Adua|Malumfashi|Mani|Mashi|Matazu|Musawa|Rimi|Sabuwa|Safana|Sandamu|Zango', 'Kebbi': 'Aleiro|Arewa Dandi|Argungu|Augie|Bagudo|Birnin Kebbi|Bunza|Dandi|Fakai|Gwandu|Jega|Kalgo|Koko/Besse|Maiyama|Ngaski|Sakaba|Shanga|Suru|Wasagu/Danko|Yauri|Zuru', 'Kogi': 'Adavi|Ajaokuta|Ankpa|Bassa|Dekina|Ibaji|Idah|Igalamela Odolu|Ijumu|Kabba/Bunu|Kogi|Lokoja|Mopa Muro|Ofu|Ogori/Magongo|Okehi|Okene|Olamaboro|Omala|Yagba East|Yagba West', 'Kwara': 'Asa|Baruten|Edu|Ekiti|Ifelodun|Ilorin East|Ilorin South|Ilorin West|Irepodun|Isin|Kaiama|Moro|Offa|Oke Ero|Oyun|Pategi', 'Lagos': 'Agege|Ajeromi-Ifelodun|Alimosho|Amuwo-Odofin|Apapa|Badagry|Epe|Eti-Osa|Ibeju-Lekki|Ifako-Ijaiye|Ikeja|Ikorodu|Kosofe|Lagos Island|Lagos Mainland|Mushin|Ojo|Oshodi-Isolo|Shomolu|Surulere', 'Nasarawa': 'Akwanga|Awe|Doma|Karu|Keana|Keffi|Kokona|Lafia|Nasarawa|Nasarawa Egon|Obi|Toto|Wamba', 'Niger': 'Agaie|Agwara|Bida|Borgu|Bosso|Chanchaga|Edati|Gbako|Gurara|Katcha|Kontagora|Lapai|Lavun|Magama|Mariga|Mashegu|Mokwa|Moya|Paikoro|Rafi|Rijau|Shiroro|Suleja|Tafa|Wushishi', 'Ogun': 'Abeokuta North|Abeokuta South|Ado-Odo/Ota|Egbado North|Egbado South|Ewekoro|Ifo|Ijebu East|Ijebu North|Ijebu North East|Ijebu Ode|Ikenne|Imeko Afon|Ipokia|Obafemi Owode|Odeda|Odogbolu|Ogun Waterside|Remo North|Shagamu', 'Ondo': 'Akoko North-East|Akoko North-West|Akoko South-East|Akoko South-West|Akure North|Akure South|Ese Odo|Idanre|Ifedore|Ilaje|Ile Oluji/Okeigbo|Irele|Odigbo|Okitipupa|Ondo East|Ondo West|Ose|Owo', 'Osun': 'Atakunmosa East|Atakunmosa West|Aiyedaade|Aiyedire|Boluwaduro|Boripe|Ede North|Ede South|Egbedore|Ejigbo|Ife Central|Ife East|Ife North|Ife South|Ifedayo|Ifelodun|Ila|Ilesa East|Ilesa West|Irepodun|Irewole|Isokan|Iwo|Obokun|Odo Otin|Ola Oluwa|Olorunda|Oriade|Orolu|Osogbo', 'Oyo': 'Afijio|Akinyele|Atiba|Atisbo|Egbeda|Ibadan North|Ibadan North-East|Ibadan North-West|Ibadan South-East|Ibadan South-West|Ibarapa Central|Ibarapa East|Ibarapa North|Ido|Irepo|Iseyin|Itesiwaju|Iwajowa|Kajola|Lagelu|Ogbomosho North|Ogbomosho South|Ogo Oluwa|Olorunsogo|Oluyole|Ona Ara|Orelope|Ori Ire|Oyo East|Oyo West|Saki East|Saki West|Surulere', 'Plateau': 'Barkin Ladi|Bassa|Bokkos|Jos East|Jos North|Jos South|Kanam|Kanke|Langtang North|Langtang South|Mangu|Mikang|Pankshin|Qua’an Pan|Riyom|Shendam|Wase', 'Rivers': 'Abua/Odual|Ahoada East|Ahoada West|Akuku-Toru|Andoni|Asari-Toru|Bonny|Degema|Eleme|Emohua|Etche|Gokana|Ikwerre|Khana|Obio/Akpor|Ogba/Egbema/Ndoni|Ogu/Bolo|Okrika|Omuma|Opobo/Nkoro|Oyigbo|Port Harcourt|Tai', 'Sokoto': 'Binji|Bodinga|Dange Shuni|Gada|Goronyo|Gudu|Gwadabawa|Illela|Isa|Kebbe|Kware|Rabah|Sabon Birni|Shagari|Silame|Sokoto North|Sokoto South|Tambuwal|Tangaza|Tureta|Wamako|Wurno|Yabo', 'Taraba': 'Ardo Kola|Bali|Donga|Gashaka|Gassol|Ibi|Jalingo|Karim Lamido|Kurmi|Lau|Sardauna|Takum|Ussa|Wukari|Yorro|Zing', 'Yobe': 'Bade|Bursari|Damaturu|Fika|Fune|Geidam|Gujba|Gulani|Jakusko|Karasuwa|Machina|Nangere|Nguru|Potiskum|Tarmuwa|Yunusari|Yusufari', 'Zamfara': 'Anka|Bakura|Birnin Magaji/Kiyaw|Bukkuyum|Bungudu|Gummi|Gusau|Kaura Namoda|Maradun|Maru|Shinkafi|Talata Mafara|Tsafe|Zurmi' };
  var PR = [['Professional', ['Accountant', 'Architect', 'Banker', 'Civil Engineer', 'Electrical Engineer', 'Mechanical Engineer', 'Software Developer / IT Professional', 'Doctor', 'Nurse / Midwife', 'Pharmacist', 'Medical Laboratory Scientist', 'Lawyer', 'Lecturer / Academic', 'Teacher', 'Journalist / Media Professional', 'Surveyor', 'Human Resources Professional', 'Marketing / Sales Professional', 'Civil Servant / Administrator', 'Agricultural Scientist']], ['Non-professional', ['Artisan (Carpenter, Welder, Mechanic, Electrician)', 'Tailor / Fashion Designer', 'Hair Stylist / Barber', 'Driver', 'Trader / Business Owner', 'Farmer', 'Fisherman', 'Security Guard', 'Cleaner', 'Cook / Caterer', 'Factory Worker', 'Delivery Rider', 'Other']]];
  function opts(a) { return a.map(function (n) { return '<option>' + n + '</option>' }).join('') }
  $('pd-pr').innerHTML = '<option value="">Select profession</option><option>Not applicable</option>' + PR.map(function (g) { return '<optgroup label="' + g[0] + '">' + opts(g[1]) + '</optgroup>' }).join('');
  $('pd-so').innerHTML = '<option value="">Select state of origin</option>' + opts(NG);
  var dn = new Date(), mx = new Date(dn.getFullYear() - 18, dn.getMonth(), dn.getDate()), mn = new Date(dn.getFullYear() - 47, dn.getMonth(), dn.getDate() + 1);
  function iso(d) { return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) }
  $('pd-dob').max = iso(mx); $('pd-dob').min = iso(mn);
  $('pd-so').addEventListener('change', function () { var g = $('pd-lg'), v = this.value; if (!v || !L[v]) { g.innerHTML = '<option value="">Select a state first</option>'; g.disabled = true; return } g.innerHTML = '<option value="">Select local government area</option>' + opts(L[v].split('|')); g.disabled = false });
  $('pd-es').addEventListener('change', function () { $('pd-prs').style.display = (this.value === 'Employed' || this.value === 'Self-Employed') ? 'inline' : 'none' });
  document.querySelectorAll('#pdf input,#pdf select,#pdf textarea').forEach(function (el) { var f = function () { bad(el.id, '') }; el.addEventListener('input', f); el.addEventListener('change', f) });
  var NAME = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'’ -]*$/;
  $('pdf').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var v = function (i) { return $(i).value.trim() }, es = v('pd-es'), emp = es === 'Employed' || es === 'Self-Employed', dob = v('pd-dob'), ph = v('pd-ph').replace(/[\s-]/g, '');
    var nm = function (i, l) { return !v(i) ? 'Enter your ' + l + '.' : NAME.test(v(i)) ? '' : 'Use letters only in your ' + l + '.' };
    var c = [['pd-sn', nm('pd-sn', 'surname')], ['pd-fn', nm('pd-fn', 'first name')], ['pd-mn', v('pd-mn') && !NAME.test(v('pd-mn')) ? 'Use letters only in your middle name.' : ''],
    ['pd-g', v('pd-g') ? '' : 'Select your gender.'], ['pd-ms', v('pd-ms') ? '' : 'Select your marital status.'],
    ['pd-dob', !dob ? 'Enter your date of birth.' : dob > $('pd-dob').max ? 'Applicants must be at least 18 years old.' : dob < $('pd-dob').min ? 'Applicants must be 46 years old or younger.' : ''],
    ['pd-ph', /^(\+234|0)[789][01]\d{8}$/.test(ph) ? '' : 'Enter a valid Nigerian number, for example 0803 123 4567.'],
    ['pd-es', es ? '' : 'Select your employment status.'],
    ['pd-pr', emp && (!v('pd-pr') || v('pd-pr') === 'Not applicable') ? 'Select your current profession.' : ''],
    ['pd-so', v('pd-so') ? '' : 'Select your state of origin.'],
    ['pd-lg', v('pd-lg') ? '' : v('pd-so') ? 'Select your local government area.' : 'Select your state of origin first.'],
    ['pd-ad', v('pd-ad').length >= 10 ? '' : 'Enter your full residential address.']], first = null, m = $('pd-m');
    c.forEach(function (x) { if (!bad(x[0], x[1]) && !first) first = x[0] });
    if (first) { m.className = 'msg err'; m.textContent = 'Please correct the highlighted fields and try again.'; $(first).focus(); return }
    m.className = 'msg'; var oldPd = store.pd || {}; store.pd = {};['sn', 'fn', 'mn', 'g', 'ms', 'dob', 'ph', 'es', 'pr', 'so', 'lg', 'ad'].forEach(function (k) { store.pd[k] = v('pd-' + k) }); unlockReview(oldPd, store.pd, [['sn', 'rv-fn'], ['fn', 'rv-fn'], ['mn', 'rv-fn'], ['dob', 'rv-dob'], ['g', 'rv-g'], ['so', 'rv-so'], ['so', 'rv-lg'], ['lg', 'rv-lg'], ['ad', 'rv-ad']]);
    if (!(await commit(m, { personal: store.pd }, 1))) return; location.hash = '#step2'
  });
  var cy = new Date().getFullYear();
  function yrs(top, ph) { var a = ['<option value="">' + ph + '</option>']; for (var y = top; y >= 1960; y--)a.push('<option>' + y + '</option>'); return a.join('') }
  $('he-gy').innerHTML = yrs(cy + 4, 'Select graduation year');
  var ENF = { WAEC: ['10 digits', '10 digits, for example 4251234567', 10], NECO: ['e.g. 2612345678AB', '10 digits followed by 2 letters, for example 2612345678AB. Older slips use 8 digits followed by 2 letters.', 12], NABTEB: ['8 digits', '8 digits. Full candidate identification numbers can be 10 to 12 letters or digits.', 12] };
  function ENX(b, n) {
    n = n.toUpperCase();
    if (b === 'WAEC') return /^\d{10}$/.test(n) ? '' : 'A WAEC examination number is exactly 10 digits.';
    if (b === 'NECO') return /^\d{10}[A-Z]{2}$/.test(n) || /^\d{8}[A-Z]{2}$/.test(n) ? '' : 'A NECO examination number is 10 digits followed by 2 letters (for example 2612345678AB). Older slips use 8 digits followed by 2 letters.';
    if (b === 'NABTEB') return /^\d{8}$/.test(n) || /^[A-Z0-9]{10,12}$/.test(n) ? '' : 'A NABTEB examination number is 8 digits. Full candidate identification numbers can be 10 to 12 letters or digits.';
    return ''
  }
  $('ss-eb').addEventListener('change', function () { var f = ENF[this.value], e = $('ss-en'); e.placeholder = f ? f[0] : 'Select examination body first'; e.maxLength = f ? f[2] : 12; $('ss-enh').textContent = f ? f[1] : 'Select your examination body to see the format.'; bad('ss-en', '') });
  $('ss-en').addEventListener('input', function (e) { if (e.isTrusted) this.value = this.value.toUpperCase().replace($('ss-eb').value === 'WAEC' ? /\D/g : /[^A-Z0-9]/g, '').slice(0, this.maxLength) });
  $('ss-sy').innerHTML = yrs(cy, 'Select start year (optional)'); $('ss-ey').innerHTML = yrs(cy, 'Select end year (optional)'); $('ss-gy').innerHTML = yrs(cy, 'Select graduation year');
  $('he-sd').min = '1950-01-01'; $('he-sd').max = iso(dn); $('he-ed').min = '1950-01-01'; $('he-ed').max = iso(new Date(cy + 6, 11, 31));
  var HG = ['Distinction', 'Upper Credit', 'Lower Credit', 'Pass'], GR = { Degree: ['First Class', 'Second Class Upper (2:1)', 'Second Class Lower (2:2)', 'Third Class', 'Pass'], HND: HG, OND: HG, NCE: ['Distinction', 'Credit', 'Merit', 'Pass'] };
  $('ed-q').addEventListener('change', function () {
    var q = this.value, he = !!GR[q]; $('ed-he').hidden = !he; $('ed-ss').hidden = q !== 'SSCE'; $('ed-hint').hidden = !!q;
    if (he) $('he-gr').innerHTML = '<option value="">Select grade</option>' + opts(GR[q]);
    document.querySelectorAll('#edf .bad').forEach(function (e) { bad(e.id, '') }); $('ed-m').className = 'msg'
  });
  document.querySelectorAll('#edf input,#edf select').forEach(function (el) { var f = function () { bad(el.id, '') }; el.addEventListener('input', f); el.addEventListener('change', f) });
  $('edf').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var v = function (i) { return $(i).value.trim() }, q = v('ed-q'), c = [['ed-q', q ? '' : 'Select your highest qualification.']], m = $('ed-m');
    if (GR[q]) {
      var sd = v('he-sd'), ed = v('he-ed'), gy = +v('he-gy');
      c.push(['he-in', v('he-in').length < 3 ? 'Enter the full name of your institution.' : ''], ['he-cs', v('he-cs').length < 2 ? 'Enter your course of study.' : ''], ['he-gr', v('he-gr') ? '' : 'Select your grade.'],
        ['he-gy', !gy ? 'Select your graduation year.' : ed && gy < +ed.slice(0, 4) ? 'Graduation year cannot be before your end date.' : ''],
        ['he-sd', !sd ? 'Enter your start date.' : sd < $('he-sd').min || sd > $('he-sd').max ? 'Enter a valid start date.' : ''],
        ['he-ed', !ed ? 'Enter your end date.' : ed < $('he-ed').min || ed > $('he-ed').max ? 'Enter a valid end date.' : sd && ed <= sd ? 'End date must be after your start date.' : ''])
    }
    else if (q === 'SSCE') {
      var sy = +v('ss-sy'), ey = +v('ss-ey'), g2 = +v('ss-gy'), en = v('ss-en').replace(/\s/g, '');
      c.push(['ss-eb', v('ss-eb') ? '' : 'Select your examination body.'], ['ss-en', !v('ss-en') ? 'Enter your examination number.' : ENX(v('ss-eb'), v('ss-en'))], ['ss-sn', v('ss-sn').length < 3 ? 'Enter the full name of your school.' : ''],
        ['ss-sy', ''], ['ss-ey', sy && ey && ey < sy ? 'End year cannot be before start year.' : ''],
        ['ss-gy', !g2 ? 'Select your graduation year.' : ey && g2 < ey ? 'Graduation year cannot be before your end year.' : sy && g2 < sy ? 'Graduation year cannot be before your start year.' : ''])
    }
    var first = null; c.forEach(function (x) { if (!bad(x[0], x[1]) && !first) first = x[0] });
    if (first) { m.className = 'msg err'; m.textContent = 'Please correct the highlighted fields and try again.'; $(first).focus(); return }
    m.className = 'msg'; var oldEd = store.ed || {}; store.ed = { q: q }; document.querySelectorAll(q === 'SSCE' ? '#ed-ss [id]' : '#ed-he [id]').forEach(function (e) { if ('value' in e) store.ed[e.id] = e.value.trim() });
    unlockReview(oldEd, store.ed, [['q', 'rv-q'], ['he-cs', 'rv-cs']]); if (!(await commit(m, { education: store.ed }, 2))) return; location.hash = '#step3'
  });
  $('rv-so').innerHTML = '<option value="">Select state of origin</option>' + opts(NG);
  $('rv-dob').max = $('pd-dob').max; $('rv-dob').min = $('pd-dob').min;
  $('rv-so').addEventListener('change', function () { var g = $('rv-lg'), s = this.value; if (!s || !L[s]) { g.innerHTML = '<option value="">Select a state first</option>'; g.disabled = true; return } g.innerHTML = '<option value="">Select local government area</option>' + opts(L[s].split('|')); g.disabled = false });
  $('rv-q').addEventListener('change', function () { $('rv-cst').style.display = this.value && this.value !== 'SSCE' ? 'inline' : 'none' });
  $('rv-nin').addEventListener('input', function (e) { if (e.isTrusted) this.value = this.value.replace(/\D/g, '') });
  document.querySelectorAll('#rvf input:not([type=radio]),#rvf select,#rvf textarea').forEach(function (el) { var f = function (e) { if (e.isTrusted) el.dataset.t = 1; bad(el.id, '') }; el.addEventListener('input', f); el.addEventListener('change', f) });
  function fill(id, val) { var e = $(id); if (val && !e.dataset.t) e.value = val }
  function unlockReview(o, n, pairs) { pairs.forEach(function (x) { if ((o[x[0]] || '') !== (n[x[0]] || '')) { var el = $(x[1]); if (el) delete el.dataset.t } }) }
  function prefillReview() {
    var p = store.pd || {}, e = store.ed || {}, s = $('rv-so');
    fill('rv-fn', [p.sn, p.fn, p.mn].filter(Boolean).join(' ')); fill('rv-em', (currentUser && currentUser.email) || $('su-e').value.trim() || $('si-e').value.trim());
    fill('rv-dob', p.dob); fill('rv-g', p.g); fill('rv-q', e.q); fill('rv-cs', e['he-cs']); fill('rv-ad', p.ad);
    if (p.so && !s.dataset.t && s.value !== p.so) { s.value = p.so; s.dispatchEvent(new Event('change')) }
    if (p.lg && !s.dataset.t && !$('rv-lg').dataset.t) $('rv-lg').value = p.lg;
    $('rv-q').dispatchEvent(new Event('change'))
  }
  function sumRow(l, v) { return v ? '<div><dt>' + esc(l) + '</dt><dd>' + esc(v) + '</dd></div>' : '' }
  function sumBlock(t, href, rows) { return '<div class="rvb"><div class="rvh"><h3>' + t + '</h3><a href="' + href + '">Edit</a></div><dl class="rvl">' + rows.join('') + '</dl></div>' }
  function renderSummary() {
    var p = store.pd || {}, e = store.ed || {}, he = !!GR[e.q];
    var tr = sumBlock('Programme track', '#step3', [sumRow('Track', store.tk || 'Not selected')]);
    var pe = sumBlock('Personal details', '#step1', [sumRow('Name', [p.sn, p.fn, p.mn].filter(Boolean).join(' ')), sumRow('Gender', p.g), sumRow('Marital status', p.ms), sumRow('Date of birth', fmtD(p.dob)), sumRow('Phone number', p.ph), sumRow('Employment status', p.es), sumRow('Current profession', p.pr), sumRow('State of origin', p.so), sumRow('Local government area', p.lg), sumRow('Address', p.ad)]);
    var ed = sumBlock('Education and qualification', '#step2', he ? [sumRow('Qualification', e.q), sumRow('Institution', e['he-in']), sumRow('Course of study', e['he-cs']), sumRow('Grade', e['he-gr']), sumRow('Graduation year', e['he-gy'])] : [sumRow('Qualification', e.q), sumRow('Examination body', e['ss-eb']), sumRow('School', e['ss-sn']), sumRow('Graduation year', e['ss-gy'])]);
    $('rv-sum').innerHTML = '<h3 class="sec first">Your details so far</h3><div class="rvg">' + tr + pe + ed + '</div>'
  }
  function showReview() { prefillReview(); renderSummary() }
  window.addEventListener('hashchange', function () { if (location.hash === '#step4') showReview() }); if (location.hash === '#step4') showReview();
  document.querySelectorAll('input[name=trk]').forEach(function (r) { r.addEventListener('change', function () { document.querySelectorAll('label.trk').forEach(function (l) { l.classList.toggle('on', l.contains(r) && r.checked) }); $('trk-t').style.display = 'none'; $('tk-m').className = 'msg' }) });
  $('tkf').addEventListener('submit', async function (ev) {
    ev.preventDefault(); var m = $('tk-m'), t = document.querySelector('input[name=trk]:checked');
    if (!t) { $('trk-t').textContent = 'Select a programme track to continue.'; $('trk-t').style.display = 'block'; m.className = 'msg err'; m.textContent = 'Select a programme track to continue.'; document.querySelector('.tracks').scrollIntoView({ block: 'center' }); return }
    store.tk = t.value; if (!(await commit(m, { programme: { track: store.tk } }, 3))) return; location.hash = '#step4'
  });
  $('rvf').addEventListener('submit', async function (ev) {
    ev.preventDefault(); var m = $('rv-m');
    if (!store.tk) { location.hash = '#step3'; return }
    var v = function (i) { return $(i).value.trim() }, nin = v('rv-nin').replace(/\s/g, ''), q = v('rv-q'), d = v('rv-dob'), fnm = v('rv-fn'),
      c = [['rv-nin', !nin ? 'Enter your National Identification Number.' : /^\d{11}$/.test(nin) ? '' : 'Your NIN must be exactly 11 digits.'],
      ['rv-fn', !fnm ? 'Enter your full name.' : NAME.test(fnm) && fnm.split(/\s+/).length > 1 ? '' : 'Enter your first name and surname, using letters only.'],
      ['rv-em', !v('rv-em') ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('rv-em')) ? '' : 'Enter a valid email address.'],
      ['rv-dob', !d ? 'Enter your date of birth.' : d > $('rv-dob').max ? 'Applicants must be at least 18 years old.' : d < $('rv-dob').min ? 'Applicants must be 46 years old or younger.' : ''],
      ['rv-g', v('rv-g') ? '' : 'Select your gender.'], ['rv-q', q ? '' : 'Select your qualification.'],
      ['rv-cs', q && q !== 'SSCE' && v('rv-cs').length < 2 ? 'Enter your course of study.' : ''],
      ['rv-so', v('rv-so') ? '' : 'Select your state of origin.'],
      ['rv-lg', v('rv-lg') ? '' : v('rv-so') ? 'Select your local government area.' : 'Select your state of origin first.'],
      ['rv-ad', v('rv-ad').length >= 10 ? '' : 'Enter your full residential address.']], first = null;
    c.forEach(function (x) { if (!bad(x[0], x[1]) && !first) first = x[0] });
    if (first) { m.className = 'msg err'; m.textContent = 'Please correct the highlighted fields and try again.'; $(first).focus(); return }
    m.className = 'msg'; store.rv = {};['nin', 'fn', 'em', 'dob', 'g', 'q', 'cs', 'so', 'lg', 'ad'].forEach(function (k) { store.rv[k] = v('rv-' + k) });
    if (!(await commit(m, { review: store.rv }, 4))) return; location.hash = '#step5'
  });
  var DOCS = [['nin', 'National Identity Card (NIN)', 'A clear copy of your NIN slip or national ID card.', 1], ['lg', 'Local Government Certificate/ID', 'Certificate of origin or identification issued by your local government.', 1], ['pp', 'Passport photograph', 'A recent, clear photo of your face on a plain background.', 1], ['pro', 'Professional certificate', 'Any trade or professional certification you hold.', 0], ['bc', 'Birth certificate or age declaration', 'Your birth certificate, or a sworn age declaration.', 1], ['deg', 'Tertiary degree certificate or statement of result', 'Required if your highest qualification is a Degree, HND, OND or NCE.', 2], ['wc', 'SSCE Certificate (WAEC/NECO/NABTEB)', 'Your SSCE certificate.', 1]], files = {}, MAXB = 5 * 1048576;
  function fmt(b) { return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB' }
  function derr(k, msg) { var t = $('up-' + k + '-t'); $('d-' + k).classList.toggle('bad', !!msg); t.textContent = msg || ''; t.style.display = msg ? 'block' : 'none' }
  $('dg').innerHTML = DOCS.map(function (d) { var k = d[0]; return '<div class="doc" id="d-' + k + '"><div class="dh"><b>' + d[1] + ' <span class="req" id="rq-' + k + '" aria-hidden="true">*</span></b><span class="tag r" id="tg-' + k + '">Required</span></div><p class="dd">' + d[2] + '</p><label class="dz" id="dz-' + k + '" for="up-' + k + '"><input type="file" id="up-' + k + '" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"><span><b>Choose a file</b> or drag it here<small>PDF, PNG or JPG, up to 5 MB</small></span></label><div class="pgb" id="pb-' + k + '" hidden><i></i></div><div class="fi" id="fi-' + k + '" hidden><span class="th"></span><div class="nm"><span></span><small></small></div><button type="button" class="lk" data-rm="' + k + '">Remove</button></div><div class="err-t" id="up-' + k + '-t" role="alert"></div></div>' }).join('');
  function showFile(k, meta, local) {
    var fi = $('fi-' + k), th = fi.querySelector('.th'); th.innerHTML = '';
    if (/^image\//.test(meta.type || '')) { var im = new Image(); im.alt = ''; th.appendChild(im); if (local) im.src = URL.createObjectURL(local); else B.downloadUrl(meta.path).then(function (u) { im.src = u }).catch(function () { th.textContent = 'IMG' }) } else th.textContent = 'PDF';
    fi.querySelector('.nm span').textContent = meta.name; fi.querySelector('small').textContent = fmt(meta.size); fi.hidden = false; $('dz-' + k).hidden = true; derr(k, '')
  }
  async function setFile(k, f) {
    if (!/\.(pdf|png|jpe?g)$/i.test(f.name) || (f.type && !/^(application\/pdf|image\/(png|jpeg))$/.test(f.type))) { derr(k, 'Upload a PDF, PNG or JPG file.'); return false }
    if (!f.size) { derr(k, 'This file is empty. Choose another file.'); return false }
    if (f.size > MAXB) { derr(k, 'This file is ' + fmt(f.size) + '. The maximum size is 5 MB.'); return false }
    if (!currentUser) { derr(k, 'Please log in again to upload your documents.'); return false }
    var old = files[k], pb = $('pb-' + k), bar = pb.firstChild; derr(k, ''); pb.hidden = false; bar.style.width = '0%'; $('dz-' + k).hidden = true; uploading++;
    try {
      var meta = await B.uploadDoc(currentUser.uid, k, f, function (p) { bar.style.width = p + '%' });
      if (old && old.path && old.path !== meta.path) { try { await B.deleteFile(old.path) } catch (x) { } }
      files[k] = meta; showFile(k, meta, f); return true
    }
    catch (e) { $('dz-' + k).hidden = !!files[k]; derr(k, (e && e.code === 'storage/unauthorized') ? 'You are not allowed to upload this file.' : 'The upload failed. Check your connection and try again.'); return false }
    finally { uploading--; pb.hidden = true }
  }
  async function rmFile(k) {
    var meta = files[k]; if (!meta) return;
    try { await B.removeDoc(currentUser.uid, k, meta) } catch (e) { derr(k, 'We could not remove this file. Try again.'); return }
    var im = $('fi-' + k).querySelector('img'); if (im && im.src.indexOf('blob:') === 0) URL.revokeObjectURL(im.src);
    delete files[k]; $('up-' + k).value = ''; $('fi-' + k).hidden = true; $('dz-' + k).hidden = false
  }
  DOCS.forEach(function (d) {
    var k = d[0], dz = $('dz-' + k), inp = $('up-' + k); inp.addEventListener('change', function () { var f = this.files[0]; if (f) setFile(k, f).then(function (ok) { if (!ok) inp.value = '' }) });
    dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('over') }); dz.addEventListener('dragleave', function () { dz.classList.remove('over') });
    dz.addEventListener('drop', function (e) { e.preventDefault(); dz.classList.remove('over'); if (e.dataTransfer.files[0]) setFile(k, e.dataTransfer.files[0]) })
  });
  document.querySelectorAll('[data-rm]').forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.rm; rmFile(k).then(function () { $('up-' + k).focus() }) }) });
  function upTags() { var he = !!(store.ed && GR[store.ed.q]); DOCS.forEach(function (d) { var k = d[0], r = d[3] === 1 || (d[3] === 2 && he), t = $('tg-' + k); $('rq-' + k).style.display = r ? 'inline' : 'none'; t.textContent = r ? 'Required' : 'Optional'; t.className = 'tag' + (r ? ' r' : ''); $('d-' + k).dataset.req = r ? '1' : '' }) }
  function prefill4() { var e = $('up-em'); if (!e.dataset.t) e.value = (store.pay && store.pay.email) || (store.rv && store.rv.em) || (currentUser && currentUser.email) || e.value; upTags() }
  $('up-em').addEventListener('input', function (e) { if (e.isTrusted) this.dataset.t = 1; bad('up-em', '') });
  window.addEventListener('hashchange', function () { if (location.hash === '#step5') prefill4() }); upTags(); if (location.hash === '#step5') prefill4();
  $('upf').addEventListener('submit', async function (ev) {
    ev.preventDefault(); var m = $('up-m'), first = null; if (uploading) { m.className = 'msg err'; m.textContent = 'Please wait for your uploads to finish.'; return }
    DOCS.forEach(function (d) { var k = d[0]; if ($('d-' + k).dataset.req === '1' && !files[k]) { derr(k, d[1] + ' is required.'); if (!first) first = 'up-' + k } else if (!files[k]) derr(k, '') });
    var em = $('up-em').value.trim(); if (!bad('up-em', !em ? 'Enter the email address for payment.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em) ? '' : 'Enter a valid email address.') && !first) first = 'up-em';
    if (first) { m.className = 'msg err'; m.textContent = 'Please fix the highlighted items and try again.'; $(first).focus(); return }
    m.className = 'msg'; store.up = files; store.pay = { email: em }; if (!(await commit(m, { pay: { email: em } }, 5))) return; location.hash = '#step6'
  });
  var LOGO = document.querySelector('header .brand img').src, FEE = null, paid = false, rec = null, loggedIn = false, phUrl = null, authReady = false, currentUser = null, doneN = 0, uploading = 0, unsubReceipt = null, lastUid = null;
  function setAuth(v) { loggedIn = v; $('lo').hidden = !v; document.querySelectorAll('nav a.al').forEach(function (x) { x.hidden = v }) }
  $('lo').addEventListener('click', async function () { try { await B.signOut() } catch (x) { } location.hash = '#home'; location.reload() });
  function naira(n) { return n == null ? 'To be confirmed' : '\u20A6' + n.toLocaleString('en-NG', { minimumFractionDigits: 2 }) }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function fmtD(s) { if (!s) return ''; var d = new Date(s + 'T00:00:00'); return isNaN(d) ? s : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }
  function sync5() { $('pay-pre').hidden = paid; $('pay-ok').hidden = !paid; $('pay-ref').textContent = rec ? rec.ref : '' }
  function prefill5() { var p = store.pd || {}, r = store.rv || {}; $('pay-n').textContent = [p.fn, p.sn].filter(Boolean).join(' ') || r.fn || 'Not provided'; $('pay-t').textContent = store.tk || 'Not selected'; $('pay-e').textContent = (store.pay && store.pay.email) || 'Not provided'; $('pay-f').textContent = naira(FEE); sync5() }
  function payMsg(e) { var c = (e && e.code) || ''; if (c === 'functions/unauthenticated') return 'Please log in again to continue.'; if (/^functions\/(failed-precondition|already-exists|invalid-argument|unavailable|not-found)$/.test(c) && e.message) return e.message; if (c === 'app/not-configured') return AM[c]; return 'We could not start the payment. Check your connection and try again.' }
  $('pay-go').addEventListener('click', async function () {
    var b = this, m = $('pay-m'); m.className = 'msg'; busy(b, true, 'Connecting to Paystack...');
    try { var r = await B.initPayment(); if (!r || !r.authorizationUrl) throw new Error('no url'); window.location.assign(r.authorizationUrl) } catch (e) { m.className = 'msg err'; m.textContent = payMsg(e); busy(b, false) }
  });
  async function buildSlip() {
    if (!paid || !rec) return; var p = store.pd || {}, e = store.ed || {}, r = store.rv || {}, ph = files.pp, he = !!GR[e.q],
      row = function (l, v) { return v ? '<div><dt>' + esc(l) + '</dt><dd>' + esc(v) + '</dd></div>' : '' },
      sec = function (t, a) { return '<section class="sl-s"><h2>' + t + '</h2><dl class="sl-g">' + a.join('') + '</dl></section>' },
      nm = [p.fn, p.mn, p.sn].filter(Boolean).join(' ') || r.fn || '', nin = r.nin ? '*******' + r.nin.slice(-4) : '', img = 'Passport photograph',
      dt = rec.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (phUrl) { URL.revokeObjectURL(phUrl); phUrl = null }
    if (ph && /\.(png|jpe?g)$/i.test(ph.name)) { try { phUrl = await B.downloadUrl(ph.path) } catch (x) { phUrl = null } if (phUrl) img = '<img src="' + phUrl + '" alt="Passport photograph of ' + esc(nm) + '">' }
    var edu = he ? [row('Highest qualification', e.q), row('Institution', e['he-in']), row('Course of study', e['he-cs']), row('Grade', e['he-gr']), row('Start date', fmtD(e['he-sd'])), row('End date', fmtD(e['he-ed'])), row('Graduation year', e['he-gy']), row('NYSC status', e['he-ny'])] : [row('Highest qualification', e.q), row('Examination body', e['ss-eb']), row('Examination number', e['ss-en']), row('Name of school', e['ss-sn']), row('Start year', e['ss-sy']), row('End year', e['ss-ey']), row('Graduation year', e['ss-gy'])];
    $('slip-doc').innerHTML = '<div class="sl-h"><img class="sl-logo" src="' + LOGO + '" alt="Connect Power"><h1>Application Acknowledgement Slip</h1><span class="sl-badge">Payment confirmed</span></div>' +
      '<div class="sl-m"><div><span>Application number</span><b>' + esc(rec.app) + '</b></div><div><span>Payment reference</span><b>' + esc(rec.ref) + '</b></div><div><span>Date issued</span><b>' + esc(dt) + '</b></div><div><span>Programme track</span><b>' + esc(store.tk || '') + '</b></div></div>' +
      '<div class="sl-ap"><div class="sl-ph">' + img + '</div><div><h2 class="sl-nm">' + esc(nm) + '</h2><p>NIN: ' + esc(nin) + '<br>' + esc(r.em || '') + '</p></div></div>' +
      sec('Personal details', [row('Surname', p.sn), row('First name', p.fn), row('Middle name', p.mn), row('Gender', p.g), row('Marital status', p.ms), row('Date of birth', fmtD(p.dob)), row('Phone number', p.ph), row('Employment status', p.es), row('Current profession', p.pr), row('State of origin', p.so), row('Local government area', p.lg), row('Residential address', p.ad)]) +
      sec('Education and qualification', edu) +
      sec('Application review details', [row('Programme track', store.tk), row('NIN', nin), row('Name on application', r.fn), row('Email address', r.em), row('Qualification', r.q), row('Course', r.cs)]) +
      sec('Payment', [row('Amount', naira(FEE)), row('Payment reference', rec.ref), row('Status', 'Confirmed'), row('Receipt email', store.pay && store.pay.email)]) +
      '<div class="sl-n">This slip acknowledges receipt of your application and payment. It is not an offer of employment. Please keep it for your records.</div><div class="sl-f">Powered by the Federal Government of Nigeria</div>'
  }
  var logoD = null;
  async function logoData() { if (logoD) return logoD; var r = await fetch(LOGO); if (!r.ok) throw new Error('logo'); logoD = await rd(await r.blob()); return logoD }
  function rd(f) { return new Promise(function (ok, no) { var fr = new FileReader(); fr.onload = function () { ok(fr.result) }; fr.onerror = no; fr.readAsDataURL(f) }) }
  function isz(u) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok([i.naturalWidth, i.naturalHeight]) }; i.onerror = function () { ok(null) }; i.src = u }) }
  async function pdfSlip() {
    var J = window.jspdf && window.jspdf.jsPDF; if (!J) return null;
    var p = store.pd || {}, e = store.ed || {}, r = store.rv || {}, he = !!GR[e.q], W = 210, M = 14, doc = new J({ unit: 'mm', format: 'a4' }), y = 0,
      nm = [p.fn, p.mn, p.sn].filter(Boolean).join(' ') || r.fn || '', nin = r.nin ? '*******' + r.nin.slice(-4) : '',
      dt = rec.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), fee = FEE == null ? 'To be confirmed' : 'NGN ' + FEE.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
      photo = null, pw = 0, pht = 0, pfm = 'JPEG', pf = files.pp;
    if (pf && /\.(png|jpe?g)$/i.test(pf.name)) { try { photo = await rd(await B.fileBlob(pf.path)); var sz = await isz(photo); if (sz) { pfm = /\.png$/i.test(pf.name) ? 'PNG' : 'JPEG'; var kk = Math.min(28 / sz[0], 34 / sz[1]); pw = sz[0] * kk; pht = sz[1] * kk } else photo = null } catch (x) { photo = null } }
    try { doc.addImage(await logoData(), 'JPEG', M, 4, 19 * 1.7927, 19) } catch (x) { doc.setTextColor(1, 60, 6); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('Connect Power', M, 16) }
    doc.setTextColor(1, 60, 6); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Application Acknowledgement Slip', W - M, 13, { align: 'right' });
    doc.setTextColor(10, 127, 22); doc.setFontSize(9); doc.text('Payment confirmed', W - M, 19, { align: 'right' });
    doc.setFillColor(10, 127, 22); doc.rect(0, 26.5, W, 1.5, 'F');
    doc.setFillColor(241, 248, 243); doc.rect(0, 28, W, 20, 'F');
    var mt = [['Application number', rec.app], ['Payment reference', rec.ref], ['Date issued', dt], ['Programme track', store.tk || '']], cw = (W - 2 * M) / 4;
    mt.forEach(function (c, i) { var x = M + i * cw; doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(78, 102, 87); doc.text(c[0], x, 35); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(16, 38, 26); doc.text(doc.splitTextToSize(String(c[1]), cw - 3), x, 41) });
    y = 56; doc.setDrawColor(211, 229, 218); doc.setLineWidth(.3); doc.rect(M, y, 28, 34);
    if (photo) doc.addImage(photo, pfm, M + (28 - pw) / 2, y + (34 - pht) / 2, pw, pht); else { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(78, 102, 87); doc.text('Photograph', M + 14, y + 18, { align: 'center' }) }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(16, 38, 26); var nl = doc.splitTextToSize(nm, W - 2 * M - 36); doc.text(nl, M + 34, y + 8);
    var ny = y + 8 + nl.length * 6.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(78, 102, 87); doc.text('NIN: ' + nin, M + 34, ny); doc.text(r.em || '', M + 34, ny + 5.5);
    y = y + 34 + 4;
    function need(h) { if (y + h > 272) { doc.addPage(); y = 16 } }
    function cell(a) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); var l = doc.splitTextToSize(String(a[1]), 85); return { l: l, h: 4 + l.length * 4.3 + 2.5, t: a[0] } }
    function put(c, x) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(78, 102, 87); doc.text(c.t, x, y); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(16, 38, 26); doc.text(c.l, x, y + 4.2) }
    function sec(t, rows) {
      rows = rows.filter(function (q) { return q[1] }); if (!rows.length) return; need(24); y += 3; doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(11, 107, 58); doc.text(t, M, y); y += 1.8; doc.setDrawColor(11, 107, 58); doc.setLineWidth(.5); doc.line(M, y, W - M, y); y += 5;
      for (var i = 0; i < rows.length; i += 2) { var a = cell(rows[i]), b = rows[i + 1] ? cell(rows[i + 1]) : null, h = Math.max(a.h, b ? b.h : 0); need(h); put(a, M); if (b) put(b, M + 93); y += h }
    }
    sec('Personal details', [['Surname', p.sn], ['First name', p.fn], ['Middle name', p.mn], ['Gender', p.g], ['Marital status', p.ms], ['Date of birth', fmtD(p.dob)], ['Phone number', p.ph], ['Employment status', p.es], ['Current profession', p.pr], ['State of origin', p.so], ['Local government area', p.lg], ['Residential address', p.ad]]);
    sec('Education and qualification', he ? [['Highest qualification', e.q], ['Institution', e['he-in']], ['Course of study', e['he-cs']], ['Grade', e['he-gr']], ['Start date', fmtD(e['he-sd'])], ['End date', fmtD(e['he-ed'])], ['Graduation year', e['he-gy']], ['NYSC status', e['he-ny']]] : [['Highest qualification', e.q], ['Examination body', e['ss-eb']], ['Examination number', e['ss-en']], ['Name of school', e['ss-sn']], ['Start year', e['ss-sy']], ['End year', e['ss-ey']], ['Graduation year', e['ss-gy']]]);
    sec('Application review details', [['Programme track', store.tk], ['NIN', nin], ['Name on application', r.fn], ['Email address', r.em], ['Qualification', r.q], ['Course', r.cs]]);
    sec('Payment', [['Amount', fee], ['Payment reference', rec.ref], ['Status', 'Confirmed'], ['Receipt email', store.pay && store.pay.email]]);
    need(22); y += 6; doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(78, 102, 87); doc.text(doc.splitTextToSize('This slip acknowledges receipt of your application and payment. It is not an offer of employment. Please keep it for your records.', W - 2 * M), M, y);
    var N = doc.getNumberOfPages(); for (var i = 1; i <= N; i++) { doc.setPage(i); doc.setFillColor(11, 107, 58); doc.rect(0, 285, W, 12, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('Powered by the Federal Government of Nigeria', W / 2, 292, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text('Page ' + i + ' of ' + N, W - M, 292, { align: 'right' }) }
    return doc.output('blob')
  }
  var bp = false; window.addEventListener('beforeprint', function () { bp = true });
  function doPrint(m) {
    bp = false; try { window.print() } catch (x) { }
    setTimeout(function () { m.className = 'msg ok'; m.textContent = bp ? 'Your print window was opened. Choose Save as PDF there if you want a copy.' : 'If the print window did not open, press Ctrl+P (Cmd+P on a Mac) and choose Print or Save as PDF.' }, 500)
  }
  $('sl-dl').addEventListener('click', async function () {
    var m = $('sl-ms'), b = this; m.className = 'msg'; b.disabled = true;
    try {
      var bl = await pdfSlip(); if (!bl) { doPrint(m); return }
      var fn = 'ConnectPower-Application-Slip-' + rec.app + '.pdf', d = window.claude && claude.use ? await claude.use('downloads') : null;
      if (d) { await d.save({ filename: fn, data: bl }) } else { var a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = fn; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href) }, 4000) }
      m.className = 'msg ok'; m.textContent = 'Your slip has been saved as a PDF. Open it to print.'
    }
    catch (x) { if (!x || x.code !== 'declined') doPrint(m) } finally { b.disabled = false }
  });

  var PRG = [
    [
      'Tech Connect',
      'Learn software development, data analysis, cybersecurity and IT support, then take up jobs in the digital economy.',
      ['Software', 'Data', 'IT support'],
      'assets/program/tech.jpg'
    ],
    [
      'Agro Connect',
      'Learn modern farming, agribusiness, food processing and agri-tech, and move into jobs and enterprise across the agricultural value chain.',
      ['Farming', 'Agribusiness', 'Processing'],
      'assets/program/agro.jpg'
    ],
    [
      'Health Connect',
      'Learn community health, nursing support, laboratory and pharmacy skills, and take up jobs in clinics, hospitals and communities.',
      ['Nursing', 'Community health', 'Laboratory'],
      'assets/program/health.jpg'
    ],
    [
      'Build Connect',
      'Learn construction, engineering and skilled trades such as welding, electrical work and plumbing, and work on real projects.',
      ['Construction', 'Engineering', 'Skilled trades'],
      'assets/program/build.jpg'
    ],
    [
      'Teach Connect',
      'Learn modern teaching, tutoring and school administration methods, and take up classroom and training roles.',
      ['Teaching', 'Tutoring', 'Administration'],
      'assets/program/teach.jpg'
    ]
  ];

  function pcard(g) {
    return `
    <article class="pc" style="background-image: url('${g[3]}')">
      <div class="pc-content">
        <h3>${g[0]}</h3>
        <p>${g[1]}</p>
        <ul class="chips">
          ${g[2].map(function (c) {
      return `<li>${c}</li>`;
    }).join('')}
        </ul>
      </div>
    </article>
  `;
  }

  $('pset').innerHTML = PRG.map(pcard).join('');

  var rmo = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function mq(setId, trackId, btnId, dur) {
    var set = $(setId), tr = $(trackId), cl = set.cloneNode(true), b = $(btnId), w = tr.parentNode; cl.removeAttribute('id'); cl.setAttribute('aria-hidden', 'true'); tr.appendChild(cl); tr.style.setProperty('--dur', dur + 's');
    b.addEventListener('click', function () { var p = w.classList.toggle('paused'); b.textContent = p ? 'Play' : 'Pause'; b.setAttribute('aria-label', (p ? 'Play ' : 'Pause ') + b.getAttribute('aria-label').replace(/^(Pause|Play) /, '')) });
  }
  var HELPED = [['helped-1.jpg', 'Participants at a skills training session', 'Skills training'], ['helped-2.jpg', 'Farmers receiving agricultural support', 'Farming support'], ['helped-3.jpg', 'A community health outreach', 'Health outreach'], ['helped-4.jpg', 'Trainees on a construction site', 'Construction apprenticeship'], ['helped-5.jpg', 'A classroom learning session', 'Classroom support'], ['helped-6.jpg', 'New employees on their first day', 'Job placement']];
  $('gset').innerHTML = HELPED.map(function (g) { return '<figure class="gp"><img data-fb="gp" src="assets/helped/' + g[0] + '" alt="' + g[1] + '" decoding="async"><span class="wm" aria-hidden="true"></span><figcaption>' + g[2] + '</figcaption></figure>' }).join('');
  // If a photo file is missing: testimonial photos fall back to initials, gallery photos to a soft placeholder.
  function imgFail(i) { var f = i.dataset.fb; if (f === 'gp') i.parentNode.classList.add('ph'); i.remove() }
  document.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.dataset && t.dataset.fb) imgFail(t) }, true);
  document.querySelectorAll('img[data-fb]').forEach(function (i) { if (i.complete && i.naturalWidth === 0) imgFail(i) });
  mq('pset', 'pt', 'pp-p', 45); mq('tset', 'tt', 'tp-p', 60); mq('gset', 'gt', 'gp-p', 55);
  window.addEventListener('hashchange', function () { if (location.hash === '#step6') prefill5(); if (location.hash === '#slip') buildSlip() }); if (location.hash === '#step6') prefill5();

  /* ---------------- Sessions, saved data and page protection ---------------- */
  function commit(m, fields, n) {
    return (async function () {
      var b = m.closest('form').querySelector('button[type=submit]');
      if (!currentUser) { location.hash = '#signin'; return false }
      busy(b, true, 'Saving...');
      try { await B.saveApp(currentUser.uid, Object.assign({}, fields, { completed: Math.max(doneN, n) })); doneN = Math.max(doneN, n); m.className = 'msg'; return true }
      catch (e) { m.className = 'msg err'; m.textContent = (e && e.code === 'permission-denied') ? 'Your application can no longer be changed.' : 'We could not save your details. Check your connection and try again.'; return false }
      finally { busy(b, false) }
    })()
  }
  function resumeHash() { return paid ? '#slip' : '#step' + Math.min(doneN + 1, 6) }
  function guard(h) {
    var prot = /^(step[1-6]|slip)$/.test(h); if (!authReady) return null;
    if (!currentUser) { if (prot) return '#signin'; return null }
    if (h === 'signin' || h === 'signup') return resumeHash();
    if (!prot) return null;
    if (paid) return (h === 'step6' || h === 'slip') ? null : '#step6';
    if (h === 'slip') return '#step6';
    return (+h.slice(4)) <= doneN + 1 ? null : resumeHash()
  }
  function toDate(t) { return t && t.toDate ? t.toDate() : (t instanceof Date ? t : new Date(t || Date.now())) }
  function setVal(id, v) { var e = $(id); if (e && v != null && v !== '') e.value = v }
  function fire(id) { var e = $(id); if (e) e.dispatchEvent(new Event('change', { bubbles: true })) }
  var PDK = ['sn', 'fn', 'mn', 'g', 'ms', 'dob', 'ph', 'es', 'pr', 'so', 'lg', 'ad'], RVK = ['nin', 'fn', 'em', 'dob', 'g', 'q', 'cs', 'so', 'lg', 'ad'];
  function hydrate(a, prof) {
    var p = a.personal || null, e = a.education || null, rv = a.review || null, tk = a.programme && a.programme.track, pay = a.pay || null, docs = a.documents || {};
    store.pd = p; store.ed = e; store.rv = rv; store.tk = tk || null; store.pay = pay;
    var P = p || { fn: prof && prof.firstName, sn: prof && prof.lastName, ph: prof && prof.phone, so: prof && prof.state };
    PDK.forEach(function (k) { if (k !== 'so' && k !== 'lg') setVal('pd-' + k, P[k]) });
    if (P.so) { setVal('pd-so', P.so); fire('pd-so'); setVal('pd-lg', P.lg) }
    fire('pd-es');
    if (e && e.q) { setVal('ed-q', e.q); fire('ed-q'); Object.keys(e).forEach(function (id) { if (id !== 'q') setVal(id, e[id]) }); if (e.q === 'SSCE') fire('ss-eb') }
    if (rv) {
      RVK.forEach(function (k) { if (k === 'so' || k === 'lg') return; setVal('rv-' + k, rv[k]); var el = $('rv-' + k); if (el) el.dataset.t = 1 });
      if (rv.so) { setVal('rv-so', rv.so); fire('rv-so'); setVal('rv-lg', rv.lg); $('rv-so').dataset.t = 1; $('rv-lg').dataset.t = 1 }
    }
    if (tk) { var r = document.querySelector('input[name=trk][value="' + tk + '"]'); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })) } }
    fire('rv-q');
    DOCS.forEach(function (d) { var k = d[0]; if (docs[k] && docs[k].path) { files[k] = docs[k]; showFile(k, docs[k]) } });
    if (pay && pay.email) { setVal('up-em', pay.email); $('up-em').dataset.t = 1 }
    upTags()
  }
  function clearState() { doneN = 0; paid = false; rec = null; store.pd = store.ed = store.rv = store.pay = store.tk = null; Object.keys(files).forEach(function (k) { delete files[k] }) }
  function afterRoute() { var h = location.hash; if (h === '#step4') showReview(); if (h === '#step5') prefill4(); if (h === '#step6') prefill5(); if (h === '#slip') buildSlip() }
  function bootDone() { authReady = true; $('boot').hidden = true }
  function warn(t) { var c = $('cfgbar'); c.textContent = t; c.hidden = false }
  if (!B.configured) warn('Supabase is not connected yet. Open js/config.js and add your Supabase keys.');
  setTimeout(function () { if (!authReady) { bootDone(); route() } }, 10000);
  $("rsf").addEventListener("submit", async function (ev) {
    ev.preventDefault(); var m = $("rs-m"), b = this.querySelector('button[type=submit]'), p = $("rs-p").value; m.className = "msg";
    if (!run([["rs-p", p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p) ? "" : "Use at least 8 characters with letters and numbers."], ["rs-c", p && $("rs-c").value === p ? "" : "The passwords do not match."]])) return;
    busy(b, true, "Saving...");
    try { await B.updatePassword(p); m.className = "msg ok"; m.textContent = "Your password has been updated."; setTimeout(function () { location.hash = currentUser ? resumeHash() : "#signin" }, 1200) } catch (e) { showErr(m, e) } finally { busy(b, false) }
  });
  B.onRecovery(function () { location.hash = "#reset" });
  B.onAuth(async function (user) {
    try {
      if (user) {
        if (lastUid !== user.uid) {
          await B.pendingSignUp(); currentUser = user; setAuth(true);
          var app = await B.loadApplication(user.uid), prof = null; try { prof = await B.getProfile(user.uid) } catch (x) { }
          doneN = app.completed || 0; hydrate(app, prof);
          try { var pi = await B.paymentInfo(); if (pi && pi.amountNaira) FEE = pi.amountNaira } catch (x) { }
          await new Promise(function (ok) {
            var first = true; if (unsubReceipt) unsubReceipt();
            unsubReceipt = B.watchReceipt(user.uid, function (r) {
              if (r) { paid = true; rec = { app: r.applicationNumber, ref: r.reference, date: toDate(r.paidAt) }; if (r.amountNaira) FEE = r.amountNaira } else { paid = false; rec = null }
              sync5(); prefill5(); if (!first) { route(); afterRoute() } if (first) { first = false; ok() }
            })
          });
          lastUid = user.uid
        }
      } else { if (unsubReceipt) { unsubReceipt(); unsubReceipt = null } lastUid = null; currentUser = null; setAuth(false); clearState() }
    } catch (e) { console.error(e); if (user) warn('We could not load your saved application. Refresh the page or check your connection.') }
    bootDone();
    var h = location.hash.slice(1);
    if (currentUser && (h === 'signin' || h === 'signup' || h === 'login')) { location.hash = resumeHash() }
    else if (currentUser && h !== 'reset' && B.takeResume()) { location.hash = resumeHash() }
    route(); afterRoute()
  });
})();

// Automatically update copyright year
document.getElementById("currentYear").textContent =
  new Date().getFullYear();


// Privacy Policy Modal
const privacyModal = document.getElementById("privacyModal");

const openPrivacy = document.getElementById("openPrivacy");
const closePrivacy = document.getElementById("closePrivacy");
const privacyDone = document.getElementById("privacyDone");

function showPrivacy() {
  privacyModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function hidePrivacy() {
  privacyModal.classList.remove("active");
  document.body.style.overflow = "";
}

openPrivacy.addEventListener("click", showPrivacy);

closePrivacy.addEventListener("click", hidePrivacy);

privacyDone.addEventListener("click", hidePrivacy);


// Close modal when clicking outside
privacyModal.addEventListener("click", (event) => {
  if (event.target === privacyModal) {
    hidePrivacy();
  }
});


// Close modal using Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" &&
    privacyModal.classList.contains("active")) {
    hidePrivacy();
  }
});
