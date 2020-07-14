
var jct = {
  api: 'https://api.jct.cottagelabs.com',
  delay: 700,
  cache: {},
  chosen: {}
}

jct.d = document;
jct.d.gebi = document.getElementById;
jct.d.gebc = document.getElementsByClassName;
jct.d.each = function(cls, key, val) {
  if (cls.indexOf('.') === 0) cls = cls.replace('.','');
  var els = jct.d.gebc(cls);
  for ( var i = 0; i < els.length; i++ ) {
    if (typeof key === 'function') {
      key(els[i]);
    } else {
      els[i][key] = val; // TODO make this handle multiple depths of keys
    }
  }
}

jct.suggesting = false;

jct.choose = function(e, el) {
  jct.suggesting = false;
  var et;
  if (e) {
    e.preventDefault();
    et = e.target
  } else if(el) {
    et = el;
  } else {
    var vis = [];
    jct.d.each('choose', function(el) {
      if (el.style.display !== 'none') vis.push(el)
    });
    if (vis.length === 1) {
      et = vis[0];
    } else {
      return;
    }
  }
  var which = et.getAttribute('which');
  var id = et.getAttribute('id');
  var title = et.getAttribute('title');
  var cls = et.getAttribute('class');
  jct.chosen[which] = {id: id, title: title};
  jct.d.gebi(which).value = title;
  jct.d.each('section',function(el) { el.style.display = 'none'; });
  jct.d.each('suggest','innerHTML','');
  //scroll(0,0); // TODO should take account of embed location and only scroll to search box height, if embedded further down a page
  if (cls.indexOf('success') !== -1) {
    jct.d.gebi('spacer').style.display = 'none';
    jct.d.gebi('compliant').style.display = 'block'; // TODO may want to add more info here about the compliance
  } else if (which === 'funder') {
    jct.d.gebi('journal').focus();
  } else if (which === 'journal') {
    jct.d.gebi('institution').focus();
  } else {
    jct.d.gebi('institution').blur();
    //jct.jx('journal/' + jct.chosen.journal.id, {funder: jct.chosen.funder.id, institution: jct.chosen.institution.id});
    //jct.d.gebi('loading').style.display = 'block';
  }
  if (jct.chosen.journal && jct.chosen.journal.id) {
    // TODO don't query every time if available values haven't changed sufficiently to alter an already received answer
    var qr = {journal: jct.chosen.journal.id};
    if (jct.chosen.funder && jct.chosen.funder.id) qr.funder = jct.chosen.funder.id;
    if (jct.chosen.institution && jct.chosen.institution.id) qr.institution = jct.chosen.institution.id;
    jct.jx(undefined, qr);
    jct.d.gebi('loading').style.display = 'block';
  }
}

jct.error = function(xhr) {
  console.log(xhr.status + ': ' + xhr.statusText);
}
jct.progress = function(e) {
  e && e.lengthComputable ? console.log(e.loaded + ' of ' + e.total + 'bytes') : console.log(e.loaded);
}
jct.success = function(xhr) {
  jct.d.gebi('loading').style.display = 'none';
  console.log(xhr.response.length + ' bytes');
  var js = JSON.parse(xhr.response);
  if (xhr.response.startsWith('[')) js = js[0];
  console.log(js);
  if (jct.suggesting) {
    jct.suggestions(js);
    jct.suggesting = false;
  } else if (js.compliance) {
    //jct.d.gebi('spacer').style.display = 'none';
    jct.d.gebi(js.compliance.compliant ? 'compliant' : 'notcompliant').style.display = 'block';
    // TODO may want to add further info to the compliant/notcompliant or result box about the compliance details
  }
}
jct.jx = function(route,q,after,api) {
  var url = api ? api : jct.api;
  if (!url.endsWith('/')) url += '/';
  if (route) url += route.startsWith('/') ? route.replace('/','') : route;
  if (typeof q === 'string') {
    url += (url.indexOf('?') === -1 ? '?' : '&') + (q.indexOf('=') === -1 ? 'q=' : '') + q;
  } else if (typeof q === 'object' ) {
    if (url.indexOf('?') === -1) url += '?';
    for ( var p in q ) url += p + '=' + q[p] + '&'
  }
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.send();
  xhr.onload = function() { xhr.status !== 200 ? jct.error(xhr) : (typeof after === 'function' ? after(xhr) : jct.success(xhr)); };
  xhr.onprogress = function(e) { jct.progress(e); };
  xhr.onerror = function() { jct.error(); };
}

jct.suggestions = function(suggs, cached) {
  jct.d.gebi('missing').style.display = 'none';
  jct.d.gebi('result').innerHTML = '';
  jct.d.gebi('compliant').style.display = 'none';
  jct.d.gebi('notcompliant').style.display = 'none';
  var sgst = '';
  var sd = jct.d.gebi('suggest'+jct.suggesting);
  var typed = jct.d.gebi(jct.suggesting).value.toLowerCase();
  jct.d.each('choose', function(el) { if (el.innerHTML.toLowerCase().indexOf(typed) === -1) { el.parentNode.removeChild(el); } });
  if (jct.cache[jct.suggesting] === undefined) jct.cache[jct.suggesting] = {string: '', data: []};
  var update = false;
  for ( var s in suggs.data ) {
    var t = suggs.data[s].title;
    var tl = t.toLowerCase();
    if (!jct.d.gebi(suggs.data[s].id)) {
      if (tl.indexOf(typed) !== -1) {
        sgst += '<p><a class="button choose' + (suggs.data[s].doaj ? ' success' : '') + '" which="' + jct.suggesting + '" title="' + t + '" id="' + suggs.data[s].id + '" href="#">' + t + '</a></p>';
      }
    } else if (!cached && jct.cache[jct.suggesting].string.indexOf(tl) === -1) {
      jct.cache[jct.suggesting].string += ' ' + tl;
      jct.cache[jct.suggesting].data.push(suggs.data[s]);
      update = true;
    }
  }
  if (update) {
    try {
      // in case we get too big for local storage...
      localStorage.setItem(jct.suggesting,JSON.stringify(jct.cache[jct.suggesting].data));
    } catch(err) {}
  }
  console.log(jct.d.gebc('choose').length)
  if (sgst.length) {
    console.log(jct.suggesting + ' ' + jct.cache[jct.suggesting].data.length);
    sd.innerHTML = sgst + sd.innerHTML;
    jct.d.each("choose", function(el) { el.addEventListener('click', jct.choose); });
  }
  if (jct.d.gebc('choose').length < 10 && cached) {
    // TODO also track how many were remaining from the last query (suggs.total - suggs.data.length)
    // and take into account if typed is still a subset of the last search, in which case there is no point triggering another search
    jct.jx('/suggest/'+jct.suggesting+'/'+typed.replace('journal','').replace(' of','').replace(' and',''));
  }
  if (!jct.d.gebc('choose')) {
    jct.d.gebi('whatsmissing').innerHTML = jct.suggesting;
    jct.d.gebi('titlemissing').innerHTML = jct.d.gebi(jct.suggesting).value;
    jct.d.gebi('missing').style.display = 'block';
    // TODO send missing value to backend
  }
}

// suggest strings based on user input, get jx from remote if not already present
jct.waiting = false;
jct.suggest = function(e) {
  // if on journal tab, could be a topic search
  // could also be an issn search starting with a number, in which case do nothing until is at least half an ISSN
  if (e === undefined) e = jct.waiting;
  if (e) {
    var which = e.target.id;
    var typed = e.target.value.toLowerCase().replace(' of','').replace('the ','');
    if ('journal'.indexOf(typed.trim()) !== -1) typed = '';
    if (typed.length === 0) {
      jct.d.each('suggest','innerHTML','');
    } else {
      if (typed.length > 1) {
        jct.suggesting = which;
        if (jct.cache[which] !== undefined && jct.cache[which].string !== undefined && jct.cache[which].string.indexOf(typed) !== -1) {
          jct.suggestions(jct.cache[which], true);
        } else {
          jct.jx('/suggest/'+which+'/'+typed);
        }
      }
    }
  }
  jct.waiting = false;
}

// preload most popular strings for first user interaction (on journals, most likely)
// store them in local storage - NOTE local storage can be up to 5MB / 2551000 characters, all journals, funders, institutions
// with IDs comes to almost that - if we end up with a lot more, may need to store just the title strings 
// separately then get the IDs when needed. Also note that we may want to start caching possible results too.
jct.preload = function() {
  var sdate = localStorage.getItem('cache');
  if (sdate && window.location.search.indexOf('storage=false') === -1) {
    var keys = ['journal','funder','institution'];
    for ( var k in keys) {
      jct.cache[keys[k]] = {string: '', data: localStorage.getItem(keys[k]) ? JSON.parse(localStorage.getItem(keys[k])) : {}};
      for ( var sk in jct.cache[keys[k]].data ) {
        jct.cache[keys[k]].string += jct.cache[keys[k]].data[sk].title.toLowerCase() + ' ';
      }
    }
    // TODO check js.date of local storage, and get any createdAt / updatedAt since then and add to local storage
    // also probably refresh after X time? or on url param?
  } else {
    var size = 2000;
    var max = 10000; // TODO once we have an idea of usage, get most popular rather than just first X on initial load
    var types = ['journal','funder','institution'];
    jct.preload._totals = {};
    jct.preload._from = {};
    jct.preload._preload = function(xhr) {
      var tps = xhr.responseURL.split('suggest/')[1].split('?')[0];
      var js = JSON.parse(xhr.response);
      if (jct.preload._totals[tps] === undefined) jct.preload._totals[tps] = js.total;
      for ( var s in js.data ) {
        jct.cache[tps].string += ' ' + js.data[s].title.toLowerCase();
        jct.cache[tps].data.push(js.data[s]);
      }
      var jcs = JSON.stringify({date: Date.now(), cache: jct.cache});
      console.log(jcs.length + ' chars going to local storage');
      try {
        localStorage.setItem('cache',Date.now());
        localStorage.setItem(tps,JSON.stringify(jct.cache[tps].data));
      } catch(err) {}
      console.log(tps + ' ' + jct.cache[tps].data.length);
      jct.preload._from[tps] += size;
      if (jct.preload._from[tps] < jct.preload._totals[tps] && jct.preload._from[tps] < max) jct.preload._get(tps);
    }
    jct.preload._get = function(tp) {
      jct.jx('suggest/'+tp, 'size=' + size + '&from='+jct.preload._from[tp], jct.preload._preload);
    }
    for ( var t in types ) {
      var tp = types[t];
      if (jct.cache[tp] === undefined) jct.cache[tp] = {string: '', data: []};
      if (jct.preload._from[tp] === undefined) jct.preload._from[tp] = 0;
      jct.preload._get(types[t]);
    }
  }
}

// start off with getting the funder automcompletes, then the journal autocompletes, which should be filtering results already
// then do further autocompletes by institution and filter the possible journals by that too
jct.setup = function() {
  var f = jct.d.gebi("funder");
  /*while (f === null) {
    console.log('waiting for page to draw');
    f = jct.d.gebi("funder");
  }*/
  console.log(f)

  var _sug = function(e) { 
    jct.d.each('help', function(el) { el.style.display = 'none'; });
    var sl = jct.d.gebi('help_'+e.target.id);
    if (sl) sl.parentNode.removeChild(sl);
    jct.d.each('choose', function(el) { if (el.innerHTML.toLowerCase().indexOf(e.target.value.toLowerCase()) === -1 || el.getAttribute('which') !== e.target.id) el.parentNode.removeChild(el); });
    if (jct.waiting === false) jct.waiting = e; setTimeout(jct.suggest,jct.delay);
  }
  jct.d.gebi("funder").addEventListener("keyup", _sug);
  jct.d.gebi("journal").addEventListener("keyup", _sug);
  jct.d.gebi("institution").addEventListener("keyup", _sug);

  var _choose = function(e) { 
    if (jct.d.gebi('help_'+e.target.getAttribute('id'))) jct.d.gebi('help_'+e.target.getAttribute('id')).style.display = 'block'; 
    jct.choose();
  }
  jct.d.gebi("funder").addEventListener("focus", _choose);
  jct.d.gebi("journal").addEventListener("focus", _choose);
  jct.d.gebi("institution").addEventListener("focus", _choose);

  jct.preload();
}
