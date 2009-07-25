#!/bin/sh
find -name ChangeLog | xargs cvs diff | grep "^\+" | sed -e "s/^\+//; s/^\+\+ .\//++ swe\//" > .cvslog.tmp
mkcommitfeed \
    --file-name doc/sami-commit.en.atom.u8 \
    --feed-url http://suika.fam.cx/www/js/sami/doc/sami-commit \
    --feed-title "SAMI ChangeLog diffs" \
    --feed-lang en \
    --feed-related-url "http://suika.fam.cx/www/js/sami/doc/readme" \
    --feed-license-url "http://suika.fam.cx/www/js/sami/doc/readme#license" \
    --feed-rights "This feed is free software; you can redistribute it and/or modify it under the same terms as Perl itself." \
    < .cvslog.tmp
cvs commit -F .cvslog.tmp $1 $2 $3 $4 $5 $6 $7 $8 $9 
rm .cvslog.tmp

## $Date: 2009/07/25 05:12:53 $
## License: Public Domain
