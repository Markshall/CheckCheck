function renderLines(element, lines) {
  element.replaceChildren();

  lines.forEach(function (line, i) {
    if (i > 0) element.appendChild(document.createElement('br'));
    element.appendChild(document.createTextNode(line));
  });
}

document.getElementById('location-name').addEventListener('input', function(e) {
  var checkInput = this.value.toUpperCase();
  var locationTextOutput = document.querySelector('.location-text')
  var checkCharOutput = document.getElementById('check-char')
  var reverseReultsOutput = document.getElementById('reverse-lookup-results')

  if (CheckCheck.phonetic.indexOf(checkInput) > -1) {
    // reverse look up

    locationTextOutput.style.display = 'none';
    checkCharOutput.style.display = 'none';
    reverseReultsOutput.style.display = 'block'
    reverseReultsOutput.innerHTML = '';

    var results = CheckCheck.reverseLookup(checkInput);
    var keys = Object.keys(results).sort();

    for (var i = 0; i < keys.length; i++) {
      var details = document.createElement('details');
      var summary = document.createElement('summary');
      var locations = document.createElement('p');

      locations.innerText = results[keys[i]].join(', ')

      summary.innerText = keys[i];

      details.appendChild(summary);
      details.appendChild(locations)

      reverseReultsOutput.appendChild(details)
    }
  }
  else {
    locationTextOutput.style.display = 'block';
    checkCharOutput.style.display = 'block';
    reverseReultsOutput.style.display = 'none'

    var results = CheckCheck.getCheckChar(this.value)
    var location = checkInput.substring(0, 4)

    if (CheckCheck.isRfcLocation(location)) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'checkcheck_input',
        'locationName': location
      });
    }

    renderLines(locationTextOutput.querySelector('#location-text'), results.map(function (result) {
      return (result.label ? result.label + ': ' : '') + '\u201C' + result.text + '\u201D';
    }));
    renderLines(checkCharOutput, results.map(function (result) {
      return (result.label ? result.label + ': ' : '') + result.checkChar;
    }));
  }
});

document.getElementById('location-name').addEventListener('focus', function(e) {
  this.value === 'NULL' && (this.value = '');
});

document.getElementById('location-name').addEventListener('blur', function(e) {
  this.value === "" && (this.value = 'NULL');
});

document.getElementById('check-char').addEventListener('click', function(e) {
  document.getElementById('location-name').focus();
})
