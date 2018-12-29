# CheckCheck

A stockroom tool I built during my time working at Argos.

## What is it?
Argos' stockroom is built with shelves in aisles ranging from bay A (alpha) to bay Z (zulu).  This means, as you stand in an aisle, you'll start at A and work your way down to Z. Each letter is a 'bay' and each bay has at-most 26 shelves (again, A-Z).  When voicing stock away using the headsets, you are prompted to say a location to it. Location names are written on the shelving and you simply just read out what is on that shelf.

To stop stock becoming lost, shelves use what is known as a 'check character' that acts as a password to the specific shelf. If you were to say "`ONE ZERO ALPHA KILO`" to the headset, it may pick it up wrong as "`ZERO ONE ALPHA KILO`" due to the headsets not always being accurate. The headset doesn't repeat back to you what you have said as the location, so you assume the stock is being voiced to wherever you have said. This is where the check character comes in to play. The check character for `ONE ZERO ALPHA KILO` will be different to the one for `ZERO ONE ALPHA KILO`, so when voicing stock, the headset will tell you it is the incorrect check character.

Now the boring stuff is out of the way, the main reason I built this is because a location name may be missing off a shelf and you need to obtain its check character; how are you going to do it with no check character written on the shelf? Easy, just punch in the location name to this web-app and it will tell you its check character.

It's also useful for stores which have multiple floors.  If a store has 2 floors, and aisles 1-40 are on the ground floor and aisles 41-70 are on the top floor whilst you are on the ground floor, you can grab the check character for a top floor location whilst you are downstairs, saving you having to go upstairs and find it manually.

This web-app has saved many people lots of time pointlessly going to locations when they aren't needed, or reluctantly going through every letter of the phonetic alphabet to find the correct check character if it is missing from a shelf.

## How it works
CheckCheck takes the location the user enters and splits it digit by digit.  Argos use a formula which determines check characters for locations which involves quite a bit of maths, I simply took this and used it to my advantage to make this app.

## Issues
Any issues should be reported to markeriksson94@live.co.uk or [filed here](https://github.com/Markshall/CheckCheck/issues).
