<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <title>CheckCheck</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600&display=swap">
    <link rel="stylesheet" href="css/reset.css?v2">
    <link rel="stylesheet" href="css/global.css?v2">

    <script src="js/checkchar.js" defer></script>
    <script src="js/app.js" defer></script>

    <link rel="apple-touch-icon" href="logo.png" />
    <link rel="icon" type="image/png" href="logo.png" />

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
        <a href="./" class="logo">
          CheckCheck
        </a>
      </div>
    </header>

    <div class="container">
      <main>
        <div class="lead-text">
          <p>Enter a shelf location to find its check character, or enter a check character to find all locations with it!</p>
          <p>
            Try the all new
            <a href="https://www.inwork.at/?ref=checkcheck&amp;utm_campaign=inworkatv2" class="inworkat" target="_blank" rel="noopener">InWork<span>At</span></a>
            to keep track of your shifts.
          </p>
        </div>

        <div class="location-box">
          <div class="location-box-main">
            <label for="location-name" class="visually-hidden">Shelf location or check character</label>
            <input type="text" class="location-name" name="location-name" id="location-name" placeholder="NULL" maxlength="8" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false">

            <p class="location-text"><span id="location-text">&ldquo;NULL&rdquo;</span></p>

            <div id="check-char" class="check-char" role="status">
              NULL
            </div>
          </div>
        </div>

        <div id="reverse-lookup-results"></div>
      </main>

      <footer>
        Designed and developed by <a href="https://www.mark-eriksson.com/" target="_blank" rel="noopener">Mark Eriksson</a>.<br />
        Check out the <a href="https://github.com/Markshall/CheckCheck" target="_blank" rel="noopener">source on GitHub</a>.

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
</html>
