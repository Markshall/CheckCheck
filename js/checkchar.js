(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CheckCheck = factory();
  }
})(this, function () {
  var phonetic = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA', 'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'X-RAY', 'YANKEE', 'ZULU'],
  numbers  = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'],
  fixedCheckChars = { 'DPA': 'VICTOR', 'SOB': 'SIERRA' };

  function getPhonetic(l) {
    for (let q = 0; q < phonetic.length; q++) {
      if (phonetic[q].substr(0, 1) === l) {
        return phonetic[q];
      }
    }
  }

  function getLocationName(location, e) {
    var locSplit  = e.split(' '),
        firstChar = location.substr(0, 1),
        lastChar  = location.substr(-1),
        returnVal = e;

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
    }

    if (location.substr(0,3) === 'SOB') {
      returnVal = 'SOB';
    }

    return returnVal;
  }

  function isRfcLocation(location) {
    return /[A-Z]{4}/i.test(location);
  }

  // Returns a list of results, each { label, text, checkChar }. There are
  // two (Store and RFC) for 4-letter locations, otherwise one with no label.
  function getCheckChar(location) {
    location = location.toUpperCase();

    if (location === 'RETUR' || location === 'RETURN' || location === 'RETURNS') {
      return [{ label: null, text: 'RETURNS', checkChar: 'FOUR EIGHT / OSCAR' }];
    }

    location = location.substring(0, 4);

    if (location in fixedCheckChars) {
      return [{ label: null, text: location, checkChar: fixedCheckChars[location] }];
    }

    const storeResult = checkCharStore(location);

    if (isRfcLocation(location)) {
      const rfcResult = checkCharRFC(location);

      return [
        { label: 'Store', text: storeResult[0], checkChar: storeResult[1] },
        { label: 'RFC', text: rfcResult[0], checkChar: rfcResult[1] }
      ];
    }

    return [{ label: null, text: storeResult[0], checkChar: storeResult[1] }];
  }

  function checkCharStore(location) {
    let locationText, checkChar, i = 0, locationString = '';

    if (location.length > 3 || location === "DPA" || location === "SOB") {
      for (let k = 2; k < 6; k++) {
        const c = location[k - 2];
        i += (location.charCodeAt(k % 4)) * (k % 3 * 2 + 3);
        locationString += ((isNaN(c) ? getPhonetic(c) : numbers[c]) || '?') + ' ';
      }

      checkChar = getPhonetic(String.fromCharCode(i % 26 + 65));
      locationString = locationString.replace(/\s$/, '');
      locationText = getLocationName(location, locationString);
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

  var reverseIndex = null;

  // Every store location 00AA-99ZZ grouped by check character, then by
  // aisle. Built on first use and reused after that.
  function reverseLookup(checkChar) {
    if (!reverseIndex) {
      reverseIndex = {};

      for (let i = 0; i <= 99; i++) {
        const aisle = i.toString().padStart(2, '0');

        for (let j = 65; j <= 90; j++) {
          for (let k = 65; k <= 90; k++) {
            const location = aisle + String.fromCharCode(j) + String.fromCharCode(k);
            const char = checkCharStore(location)[1];

            reverseIndex[char] = reverseIndex[char] || {};
            reverseIndex[char][aisle] = reverseIndex[char][aisle] || [];
            reverseIndex[char][aisle].push(location);
          }
        }
      }
    }

    return reverseIndex[checkChar.toUpperCase()] || {};
  }

  return {
    phonetic: phonetic,
    numbers: numbers,
    isRfcLocation: isRfcLocation,
    getCheckChar: getCheckChar,
    checkCharStore: checkCharStore,
    checkCharRFC: checkCharRFC,
    reverseLookup: reverseLookup
  };
});
