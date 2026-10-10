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

    var results = {};

    for (var i = 0; i <= 99; i++) {
      var aisle = i.toString().padStart(2, '0')
      for (var j = 65; j <= 90; j++) {
        for (var k = 65; k <= 90; k++) {
          var locationName = aisle + String.fromCharCode(j) + String.fromCharCode(k)
          var [, checkChar] = CheckCheck.getCheckChar(locationName)

          if (checkChar === checkInput) {
            var bay = locationName.substring(0, 2)

            if (!(bay in results)) {
              results[bay] = [];
            }

            results[bay].push(locationName)
          }
        }
      }
    }

    var keys = Object.keys(results);
    keys.sort()

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

    var [locationName, checkChar] = CheckCheck.getCheckChar(this.value)
    var location = checkInput.substring(0, 4)

    if (CheckCheck.isRfcLocation(location)) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'checkcheck_input',
        'locationName': location
      });
    }

    locationTextOutput.querySelector('#location-text').innerHTML = locationName;
    checkCharOutput.innerHTML = checkChar
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
