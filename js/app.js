(function () {
  'use strict';

  const input = document.getElementById('location-name');
  const locationTextOutput = document.querySelector('.location-text');
  const locationText = document.getElementById('location-text');
  const checkCharOutput = document.getElementById('check-char');
  const reverseResultsOutput = document.getElementById('reverse-lookup-results');
  let lastTrackedLocation = null;

  function renderLines(element, lines) {
    element.replaceChildren();

    lines.forEach(function (line, i) {
      if (i > 0) element.appendChild(document.createElement('br'));
      element.appendChild(document.createTextNode(line));
    });
  }

  function showReverseLookup(checkChar) {
    const results = CheckCheck.reverseLookup(checkChar);

    locationTextOutput.style.display = 'none';
    checkCharOutput.style.display = 'none';
    reverseResultsOutput.style.display = 'block';

    reverseResultsOutput.replaceChildren(...Object.keys(results).sort().map(function (aisle) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      const locations = document.createElement('p');

      summary.textContent = aisle;
      locations.textContent = results[aisle].join(', ');

      details.append(summary, locations);
      return details;
    }));
  }

  function showCheckChar(value) {
    const results = CheckCheck.getCheckChar(value);
    const location = value.toUpperCase().substring(0, 4);

    locationTextOutput.style.display = 'block';
    checkCharOutput.style.display = 'block';
    reverseResultsOutput.style.display = 'none';

    if (CheckCheck.isRfcLocation(location) && location !== lastTrackedLocation) {
      lastTrackedLocation = location;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'checkcheck_input',
        'locationName': location
      });
    }

    renderLines(locationText, results.map(function (result) {
      return (result.label ? result.label + ': ' : '') + '“' + result.text + '”';
    }));
    renderLines(checkCharOutput, results.map(function (result) {
      return (result.label ? result.label + ': ' : '') + result.checkChar;
    }));
  }

  input.addEventListener('input', function () {
    const value = this.value.trim();

    if (CheckCheck.phonetic.includes(value.toUpperCase())) {
      showReverseLookup(value);
    } else {
      showCheckChar(value);
    }
  });

  checkCharOutput.addEventListener('click', function () {
    input.focus();
  });
})();
