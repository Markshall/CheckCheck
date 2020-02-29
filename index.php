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
  </head>

  <body>
    <header>
      <div class="container">
        <a href="/check/" class="logo">
          CheckCheck
        </a>
      </div>
    </header>

    <div class="container">
      <main>
        <p class="headline">Enter a shelf location to find it's check character.</p>
        <p>Need to keep track of your hours? Try <a href="https://www.inwork.at/?ref=checkcheck" target="_blank">InWorkAt</a>.

        <div class="location-box">
          <div class="location-box-main">
            <input type="text" maxlength="4" class="location-name" name="location-name" id="location-name" value="NULL">

            <p class="location-text">&ldquo;<span id="location-text">NULL</span>&rdquo;</p>

            <div id="check-char" class="check-char">
              NULL
            </div>
          </div>
        </div>
      </main>

      <footer>
        Designed and developed by <a href="https://www.mark-eriksson.com/" target="_blank">Mark Eriksson</a>.

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
    var phonetic = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA', 'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'X-RAY', 'YANKEE', 'ZULU'],
    numbers  = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'],
    locationString = '';

    function getPhonetic(l) {
      for (q=0;q<phonetic.length;q++) {
        if (phonetic[q].substr(0,1) === l) {
          return phonetic[q];
          break;
        }
      }
    }

    function getLocationName(e) {
      var location  = document.getElementById('location-name').value.toUpperCase(),
          locSplit  = e.split(' '),
          firstChar = location.substr(0,1),
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

    document.getElementById('location-name').addEventListener('input', function(e) {
      var self = this,
          locationText = document.getElementById('location-text'),
          checkChar = document.getElementById('check-char'),
          location = self.value.toUpperCase(),
          i = 0;

      self.value = location.replace(/[^a-zA-Z0-9_+-]/g, '');

      if (this.value.length > 3 || this.value === "DPA" || this.value === "SOB") {
        for (k=2;k<6;k++) {
          i+=(location.charCodeAt(k%4)) * (k%3*2+3);
          locationString += ((!!isNaN(c=location[k-2])) ? getPhonetic(c) : numbers[c]) + ' ';
        }

        checkChar.innerText = getPhonetic(String.fromCharCode(i%26+65));
        locationString = locationString.replace(/\s$/, '');
        locationText.innerText = getLocationName(locationString);
        locationString = '';
      } else {
        locationText.innerText = checkChar.innerText = 'NULL';
      }

      e.preventDefault();
    });

    document.getElementById('location-name').addEventListener('focus', function(e) {
      this.value === 'NULL' && (this.value = '');
    });

    document.getElementById('location-name').addEventListener('blur', function(e) {
      this.value === "" && (this.value = 'NULL');
    });
  </script>
</html>
