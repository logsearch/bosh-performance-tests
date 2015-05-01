function createDomBasedGraphs(selector, s) {
  $$(selector).each(function (o) {
    var pre = o.getElement('pre');
    var presence = o.getParent('*[data-if-metric]');

    var markup = pre.get('text');

    if (presence) {
      s.datasource.hasSeries(presence.getAttribute('data-if-metric')).then(function (exists) {
        if (!exists) {
          presence.destroy();
        
          return;
        }

        createGraphFromSyntax(s, o, markup);
      });
    } else {
      createGraphFromSyntax(s, o, markup);
    }
  });
}

function createGraphFromSyntax(s, dom, markup, env) {
  var markup = markup.split("\n");
  var options = {};

  var g = new HighchartsGraph(dom);
  var line = -1;
  
  var wrapper = '';
  
  for (var sn in s) {
    if ('function' != typeof s[sn]) {
      continue;
    }

    wrapper += 'var ' + sn + '=s.' + sn + '.bind(s);';
  }
  
  wrapper += 'return eval(cmd);'
  
  var simpleeval = new Function('s', 'cmd', '$', wrapper);

  markup.forEach(function (cmd) {
    if ('' == cmd.trim()) {
      return;
    } else if ('#' == cmd[0]) {
      return;
    }
    
    line += 1;
    
    if (0 == line) {
      if ('{' == cmd[0]) {
        g.setOptions(eval('(' + cmd + ')'));
        
        return;
      }
    }

    var res = simpleeval(s, cmd, env);

    if (res) {
      g.addSeries(res);
    }
  });
  
  g.render();
}
