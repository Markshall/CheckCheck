<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="minimum-scale=1.0, width=device-width, maximum-scale=1.0, user-scalable=no, minimal-ui, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <title>CheckCheck</title>

    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600">
    <link rel="stylesheet" href="css/reset.css?v2">
    <link rel="stylesheet" href="css/global.css?v2">

    <link rel="apple-touch-icon" href="logo.png" />
    <link rel="shortcut icon" type="image/x-icon" href="logo.png" />

    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-21727306-1"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'UA-21727306-1');
    </script>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-PV3S2MV');</script>
    <!-- End Google Tag Manager -->
  </head>

  <body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PV3S2MV"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <header>
      <div class="container">
        <a href="/check/" class="logo">
          CheckCheck
        </a>
      </div>
    </header>

    <div class="container">
      <main>
        <div class="lead-text">
          <p>Enter a shelf location to find its check character, or enter a check character to find all locations with it!</p>
          <p>Try <a href="https://www.inwork.at/?ref=checkcheck" rel="noreferrer" target="_blank">InWorkAt</a> to keep track of your hours.</p>
        </div>

        <div class="location-box">
          <div class="location-box-main">
            <form id="test" method="get">
              <input type="text" class="location-name" name="location-name" id="location-name" value="NULL" spellcheck="false">
            </form>

            <p class="location-text"><span id="location-text">&ldquo;NULL&rdquo;</span></p>

            <div id="check-char" class="check-char">
              NULL
            </div>
          </div>
        </div>

        <div id="reverse-lookup-results"></div>
      </main>

      <footer>
        Designed and developed by <a href="https://www.mark-eriksson.com/" target="_blank">Mark Eriksson</a>.<br />
        Check out the <a href="https://github.com/Markshall/CheckCheck" target="_blank">source on GitHub</a>.

        <div class="adspace">
          <script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
          <!-- CheckCheck Ads -->
          <ins class="adsbygoogle"
          style="display:inline-block;margin:0 auto;width:320px;height:100px"
          data-ad-client="ca-pub-4959011941735218"
          data-ad-slot="4988962960"></ins>
          <script>
          (adsbygoogle = window.adsbygoogle || []).push({});
          </script>
        </div>
      </footer>
    </div>
  </body>

  <script>
    document.querySelector('#test').addEventListener('submit', function(e) {
      console.log('hey')
      e.preventDefault();
      return false;
    });

    var phonetic = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA', 'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'X-RAY', 'YANKEE', 'ZULU'],
    numbers  = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'],
    locationString = '';

    function getPhonetic(l) {
      for (q = 0; q < phonetic.length; q++) {
        if (phonetic[q].substr(0, 1) === l) {
          return phonetic[q];
        }
      }
    }

    function getLocationName(e) {
      var location  = document.getElementById('location-name').value.toUpperCase(),
          locSplit  = e.split(' '),
          firstChar = location.substr(0, 1),
          lastChar  = location.substr(-1),
          returnVal = e,
          checkChar = document.getElementById('check-char');

      //check for jewellery, security, linbins, bulk
      if (firstChar === "J" || firstChar === "S" || firstChar === "L" || firstChar === "Z") {
        switch (firstChar) {
          case 'J':
            returnVal = 'JEWELLERY ' + [locSplit[1], locSplit[2], locSplit[3]].join(' ');
          break;

          case 'S':
            returnVal = 'SECURITY ' + [locSplit[1], locSplit[2], locSplit[3]].join(' ');
          break;

          case 'L':
            returnVal = [locSplit[1], locSplit[2]].join(' ') + ' LINBIN ' + locSplit[3];
          break;

          case 'Z':
            returnVal = [locSplit[1], locSplit[2]].join(' ') + ' BULK ' + locSplit[3];
          break;
        }
      }

      //check for after,before
      if (lastChar === "+" || lastChar === "-") {
        switch (lastChar) {
          case '+':
            returnVal = 'AFTER ' + [locSplit[0], locSplit[1], locSplit[2]].join(' ');
          break;

          case '-':
            returnVal = 'BEFORE ' + [locSplit[0], locSplit[1], locSplit[2]].join(' ');
          break;
        }
      }

      //check for misc locations
      if (location.substr(0,2) == 'CA') {
        returnVal = 'CASH OFFICE ' + [locSplit[2], locSplit[3]].join(' ');
      }

      if (location.substr(0, 2) === 'CP') {
        returnVal = 'COLLECTION POINT ' + [locSplit[2], locSplit[3]].join(' ');
      }

      if (location === 'RETS') {
        returnVal = 'RETURNS';
      }

      if (location.substr(0,3) === 'DPA') {
        returnVal = 'DPA';
        checkChar.innerText = 'VICTOR';
      }

      if (location.substr(0,3) === 'SOB') {
        returnVal = 'SOB';
        checkChar.innerText = 'SIERRA';
      }

      return returnVal;
    }

    function getCheckChar(location) {
      var locationText = '',
          checkChar = '',
          location = location.toUpperCase(),
          i = 0;

      if (!(location === "RETURNS" || location === "RETURN" || location === "RETUR")) location = location.substring(0, 4);

      if (/[a-zA-Z]{4}/i.test(location)) {
        //RFC Way
        const rfcResult = checkCharRFC(location)
        const storeResult = checkCharStore(location)

        return [
          `Store: &ldquo;${storeResult[0]}&rdquo;<br />RFC: &ldquo;${rfcResult[0]}&rdquo;`,
          `Store: ${storeResult[1]}<br />RFC: ${rfcResult[1]}`
        ];
      }
      else if (location == "RETURNS") {
        locationText = "RETURNS";
        checkChar = "FOUR EIGHT / OSCAR";
      }
      else {
        // Store Way
        const storeResult = checkCharStore(location);

        return [
          `&ldquo;${storeResult[0]}&rdquo;`,
          storeResult[1]
        ]
      }

      return [locationText, checkChar]
    }

    function checkCharStore(location) {
      let locationText, checkChar, i = 0;

      if (location.length > 3 || location === "DPA" || location === "SOB") {
        for (k = 2; k < 6; k++) {
          i += (location.charCodeAt(k % 4)) * (k % 3 * 2 + 3);
          locationString += ((!!isNaN(c=location[k - 2])) ? getPhonetic(c) : numbers[c]) + ' ';
        }

        checkChar = getPhonetic(String.fromCharCode(i % 26 + 65));
        locationString = locationString.replace(/\s$/, '');
        locationText = getLocationName(locationString);
        locationString = '';
      } else {
        locationText = checkChar = 'NULL';
      }

      return [locationText, checkChar];
    }

    function checkCharRFC(location) {
      let spoken = "";
      let checkDigit = 45;
      let locationText, checkChar;

      for (let i = 0; i < 4; i++) {
        let a = location.charCodeAt(i) - 65;
        spoken += phonetic[a] + (i === 3 ? "" : " ");

        if (i === 0) {
          a *= 5;
        }
        else if (i == 1 || i == 2) {
          a *= 7;
        }
        else {
          a *= 3;
        }

        checkDigit += a;

      }
      checkDigit = Math.round(((checkDigit / 99) - Math.floor(checkDigit / 99)) * 99);
      locationText = spoken;
      checkChar = numbers[Math.floor(checkDigit / 10)] + " " + numbers[checkDigit % 10];

      return [locationText, checkChar];
    }

    document.getElementById('location-name').addEventListener('input', function(e) {
      var checkInput = this.value.toUpperCase();
      var locationTextOutput = document.querySelector('.location-text')
      var checkCharOutput = document.getElementById('check-char')
      var reverseReultsOutput = document.getElementById('reverse-lookup-results')

      if (phonetic.indexOf(checkInput) > -1) {
        // reverse look up

        locationTextOutput.style.display = 'none';
        checkCharOutput.style.display = 'none';
        reverseReultsOutput.style.display = 'block'
        reverseReultsOutput.innerHTML = '';

        var results = {};

        for (var i = 0; i <= 99; i++) {
          var i = i.toString().padStart(2, '0')
          for (var j = 65; j <= 90; j++) {
            for (var k = 65; k <= 90; k++) {
              var locationName = i + String.fromCharCode(j) + String.fromCharCode(k)
              var [, checkChar] = getCheckChar(locationName)

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

        var [locationName, checkChar] = getCheckChar(this.value)

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
  </script>
</html>
