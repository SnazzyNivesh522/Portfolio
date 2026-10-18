(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Theme toggle ---------- */
  var root = document.documentElement;
  function currentTheme() {
    var set = root.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  $("#theme-toggle").addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) { }
  });

  /* ---------- Scroll progress + current nav item ---------- */
  var bar = $("#progress-bar");
  var navLinks = $$('.nav a[href^="#"]');
  var sections = navLinks.map(function (a) { return $(a.getAttribute("href")); });
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.transform = "scaleX(" + (max > 0 ? h.scrollTop / max : 0) + ")";
    var y = window.scrollY + 120, cur = -1;
    sections.forEach(function (s, i) { if (s && s.offsetTop <= y) cur = i; });
    navLinks.forEach(function (a, i) { a.classList.toggle("is-current", i === cur); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Rotating role ---------- */
  var roles = ["DevSecOps Engineer", "Security Platform Engineer", "Cloud & Network Engineer", "Automation Builder"];
  var typed = $("#typed");
  if (!reduced) {
    var ri = 0, ci = roles[0].length, deleting = true;
    setTimeout(function tick() {
      var word = roles[ri];
      if (deleting) {
        ci--;
        if (ci <= 0) { deleting = false; ri = (ri + 1) % roles.length; }
      } else {
        ci++;
        if (ci >= roles[ri].length) { deleting = true; typed.textContent = roles[ri]; setTimeout(tick, 2200); return; }
      }
      typed.textContent = roles[ri].slice(0, Math.max(ci, 0)) || "​";
      setTimeout(tick, deleting ? 35 : 70);
    }, 2600);
  }

  /* ---------- Layer stack ---------- */
  var layerInfo = {
    app: { t: "Application & APIs", b: "Built the ASM/VAPT automation platform and consolidated separate FastAPI and Flask services into one OpenAPI contract.", link: "#case-asm", l: "Read the ASM case" },
    data: { t: "Data & search", b: "Recovered a flood-stage Elasticsearch SIEM cluster with zero data loss, then designed searchable snapshots on S3.", link: "#case-es", l: "Read the recovery" },
    secrets: { t: "Secrets & identity", b: "Took HashiCorp Vault to production, run an internal CA with mTLS, and moved auth to Keycloak and Entra External ID.", link: "#case-secrets", l: "Read about Vault and PKI" },
    compute: { t: "Compute", b: "Operate around ten servers per region across 4 AWS regions, 2 OCI regions and 2 customer data centers.", link: "#case-network", l: "Read the network design" },
    virt: { t: "Virtualization", b: "Administer 3 ESXi hosts and 40+ VMs, and trace faults from guest OS through hypervisor to host hardware.", link: "#pipeline", l: "See my current role" },
    edge: { t: "Network edge", b: "Restored HTTPS for 3 domains when an ISP failure broke DNAT and Cloudflare load balancing across 4 links.", link: "#case-isp", l: "Read the outage" }
  };
  var stack = $(".stack");
  var packet = $("#packet");
  var detail = $("#layer-detail");
  var layerBtns = $$("#layers button");
  layerBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      layerBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      var li = btn.parentElement;
      var top = li.offsetTop + 17 - 3;
      packet.classList.add("is-on");
      packet.style.top = top + "px";
      var info = layerInfo[btn.dataset.layer];
      detail.classList.remove("swap");
      void detail.offsetWidth;
      detail.innerHTML = '<span class="d-title"></span><span class="d-body"></span><a></a>';
      detail.querySelector(".d-title").textContent = info.t;
      detail.querySelector(".d-body").textContent = info.b;
      var a = detail.querySelector("a");
      a.href = info.link; a.textContent = info.l;
      a.addEventListener("click", function () { openCase(info.link); });
      detail.classList.add("swap");
    });
  });
  // start the packet at the top layer once the boot trace has finished
  packet.style.top = (layerBtns[0].parentElement.offsetTop + 14) + "px";

  /* ---------- Scroll reveal + count-up ---------- */
  function countUp(el) {
    var to = +el.dataset.to;
    if (reduced) { el.textContent = to; return; }
    var t0 = null, dur = 1100;
    el.textContent = "0";
    requestAnimationFrame(function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    });
  }
  var revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = el.parentElement ? $$(":scope > .reveal", el.parentElement) : [];
        var idx = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(idx * 60, 360) + "ms";
        el.classList.add("is-in");
        $$(".count", el).forEach(countUp);
        if (el.id === "pipe") startLog(3);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
    startLog(3);
  }

  /* ---------- Case studies: expand + filter ---------- */
  function setOpen(btn, open) {
    var body = document.getElementById(btn.getAttribute("aria-controls"));
    btn.setAttribute("aria-expanded", String(open));
    body.hidden = !open;
    if (open) { body.classList.remove("opening"); void body.offsetWidth; body.classList.add("opening"); }
  }
  $$(".case-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setOpen(btn, btn.getAttribute("aria-expanded") !== "true");
    });
  });
  function openCase(hash) {
    var c = $(hash);
    if (c && c.classList.contains("case")) {
      if (c.classList.contains("is-hidden")) applyFilter("all");
      setOpen($(".case-toggle", c), true);
    }
  }
  if (location.hash) openCase(location.hash);

  var chips = $$(".chip");
  var cases = $$(".case");
  function applyFilter(f) {
    chips.forEach(function (c) {
      var on = c.dataset.filter === f;
      c.classList.toggle("is-on", on);
      c.setAttribute("aria-pressed", String(on));
    });
    var shown = 0;
    cases.forEach(function (c, i) {
      var match = f === "all" || c.dataset.tags.split(" ").indexOf(f) !== -1;
      c.classList.toggle("is-hidden", !match);
      c.classList.add("is-in");
      if (match) {
        shown++;
        c.classList.remove("pop"); void c.offsetWidth;
        c.style.animationDelay = (shown * 50) + "ms";
        c.classList.add("pop");
      }
    });
    $("#cases-empty").hidden = shown > 0;
  }
  chips.forEach(function (c) { c.addEventListener("click", function () { applyFilter(c.dataset.filter); }); });

  /* ---------- Career pipeline job logs ---------- */
  var logs = [
    { job: "commit", lines: [
      ["cmd", "$ git commit -m \"research internship\""],
      ["", "› BISAG-N, May to Aug 2024"],
      ["", "› AI decision support for agriculture and forestry"],
      ["", "› Python, TensorFlow, QGIS, Google Earth Engine"],
      ["ok", "✓ data accuracy +40%, analysis time -30%"]
    ] },
    { job: "build", lines: [
      ["cmd", "$ make associate-software-developer"],
      ["", "› automated the core VAPT tooling"],
      ["", "› built S3 content classification over 900GB+ (~6M files)"],
      ["", "› deployed full-tunnel WireGuard across distributed systems"],
      ["ok", "✓ Rising Star award, Q1 2025"],
      ["ok", "✓ promoted"]
    ] },
    { job: "scan", lines: [
      ["cmd", "$ ./scan --role software-developer-security"],
      ["", "› ASM/VAPT platform: 20+ tools, 40-60 IP scopes"],
      ["", "› CVE intelligence mapped to ATT&CK, D3FEND, NIST, ISO 27001"],
      ["", "› cybersquatting and impersonation detection engine"],
      ["ok", "✓ manual VA and recon effort reduced ~80%"],
      ["ok", "✓ promoted"]
    ] },
    { job: "deploy", lines: [
      ["cmd", "$ ./deploy --env production --role devsecops-engineer"],
      ["", "› 4 AWS regions, 2 OCI regions, 2 customer data centers"],
      ["", "› 3 ESXi hosts, 40+ VMs, single-ingress network design"],
      ["", "› Vault, internal CA and mTLS in production"],
      ["", "› GitLab CI/CD adopted company-wide"],
      ["dim", "… running since Jun 2026"]
    ] }
  ];
  var logEl = $("#log"), logTitle = $("#log-title");
  var logTimers = [];
  var stageBtns = $$("#pipe button");
  function startLog(n) {
    logTimers.forEach(clearTimeout); logTimers = [];
    stageBtns.forEach(function (b, i) {
      b.classList.toggle("is-on", i === n);
      b.setAttribute("aria-pressed", String(i === n));
    });
    logTitle.textContent = "job log · " + logs[n].job;
    logEl.textContent = "";
    logs[n].lines.forEach(function (ln, i) {
      logTimers.push(setTimeout(function () {
        var span = document.createElement("span");
        span.className = "ln " + ln[0];
        span.textContent = ln[1];
        logEl.appendChild(span);
      }, reduced ? 0 : 260 + i * 320));
    });
  }
  stageBtns.forEach(function (b) {
    b.addEventListener("click", function () { startLog(+b.dataset.stage); });
  });

  /* ---------- Terminal ---------- */
  var out = $("#term-out"), input = $("#term-in"), form = $("#term-form");
  var history = [], hIdx = 0;
  function print(text, cls) {
    var div = document.createElement("div");
    if (cls) div.className = cls;
    div.textContent = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
    return div;
  }
  function printLink(label, href) {
    var div = document.createElement("div");
    var a = document.createElement("a");
    a.href = href; a.textContent = label;
    if (/^http/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    div.appendChild(a);
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }
  var commands = {
    help: function () {
      print("available commands:", "dim");
      print("  whoami        who I am");
      print("  experience    roles, newest first");
      print("  work          production case studies");
      print("  skills        what I work with");
      print("  nmap nivesh   scan me");
      print("  contact       how to reach me");
      print("  resume        download my resume");
      print("  theme         toggle light and dark");
      print("  clear         clear the screen");
    },
    whoami: function () {
      print("Nivesh Pritmani, DevSecOps Engineer at SharkStriker (Ahmedabad, India)");
      print("Multi-cloud infrastructure, network security, Elasticsearch, Vault/PKI and security automation.", "dim");
    },
    experience: function () {
      print("Jun 2026 - now   DevSecOps Engineer, SharkStriker", "ok");
      print("Jan - May 2026   Software Developer (Security), SharkStriker");
      print("Jan - Dec 2025   Associate Software Developer, SharkStriker");
      print("May - Aug 2024   Research Intern, BISAG-N");
    },
    work: function () {
      $$(".case").forEach(function (c) {
        printLink("• " + $(".case-title", c).textContent, "#" + c.id);
      });
      print("select one to jump to it", "dim");
    },
    skills: function () {
      $$("#skills .skills > div").forEach(function (g) {
        print($("h3", g).textContent.toLowerCase().replace(/ /g, "-") + ":", "ok");
        print("  " + $$("li", g).map(function (l) { return l.textContent; }).join(", "));
      });
    },
    nmap: function (args) {
      if (args[0] !== "nivesh") { print("usage: nmap nivesh", "dim"); return; }
      var lines = [
        ["Starting Nmap scan against nivesh.portfolio", "dim"],
        ["PORT      STATE  SERVICE", ""],
        ["22/tcp    open   linux, networking, troubleshooting", ""],
        ["443/tcp   open   tls, mtls, pki, vault", ""],
        ["9200/tcp  open   elasticsearch, logstash", ""],
        ["8080/tcp  open   python, fastapi, automation", ""],
        ["Host is up. Status: open to new roles.", "ok"]
      ];
      lines.forEach(function (l, i) { setTimeout(function () { print(l[0], l[1]); }, reduced ? 0 : i * 180); });
    },
    contact: function () {
      printLink("niveshpritmani@gmail.com", "mailto:niveshpritmani@gmail.com");
      printLink("linkedin.com/in/nivesh-pritmani-990316227", "https://www.linkedin.com/in/nivesh-pritmani-990316227/");
      printLink("github.com/SnazzyNivesh522", "https://github.com/SnazzyNivesh522");
    },
    resume: function () {
      printLink("Nivesh_Pritmani_Resume.pdf", "assets/Nivesh_Pritmani_Resume.pdf");
    },
    theme: function () { $("#theme-toggle").click(); print("theme switched to " + currentTheme(), "ok"); },
    clear: function () { out.textContent = ""; },
    sudo: function () { print("nivesh is not in the sudoers file. This incident will be reported.", "dim"); },
    ls: function () { print("about.txt  experience/  work/  skills.yml  resume.pdf"); },
    "rm": function () { print("Permission denied. Nice try.", "dim"); }
  };
  function run(raw) {
    var line = raw.trim();
    print("nivesh@portfolio:~$ " + line, "cmd");
    if (!line) return;
    history.push(line); hIdx = history.length;
    var parts = line.split(/\s+/), name = parts[0].toLowerCase();
    if (name === "cat" && parts[1] === "about.txt") name = "whoami";
    if (name === "cat" && parts[1] === "skills.yml") name = "skills";
    var fn = commands[name];
    if (fn) fn(parts.slice(1));
    else print(name + ": command not found. Type help.", "dim");
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    run(input.value);
    input.value = "";
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp" && hIdx > 0) { hIdx--; input.value = history[hIdx]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { hIdx = Math.min(hIdx + 1, history.length); input.value = history[hIdx] || ""; e.preventDefault(); }
    else if (e.key === "Tab") {
      var v = input.value.trim();
      var m = Object.keys(commands).filter(function (k) { return v && k.indexOf(v) === 0; });
      if (m.length === 1) { input.value = m[0]; e.preventDefault(); }
    }
  });
  $$(".term-hints button").forEach(function (b) {
    b.addEventListener("click", function () { run(b.dataset.cmd); });
  });
  $("#term").addEventListener("click", function (e) {
    if (e.target.tagName !== "A" && e.target.tagName !== "BUTTON") input.focus({ preventScroll: true });
  });
  print("Welcome. Type help to list commands, or pick one below.", "dim");
})();
