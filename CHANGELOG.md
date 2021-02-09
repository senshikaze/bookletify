# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2021-02-09

### Fixed

 - Fixed margin on progress bar.

## [1.1.0] - 2021-02-09

### Added

 - Set the site title to Bookletify.
 - A message is now shown when the pdf is converted.
 - An indeterminate progress bar is now shown if conversion takes longer than a second.
 - An error message is shown if an error occurs.
 - Added links to the license of the libraries and styles used.
 - Added the option to leave the inside page of the cover blank.

### Changed

 - Conversion now happens in a web worker.
 - Clarified and expanded the what it does section.
 - Download mechanism now relies on a `<a>` dom element rather than using the downloadjs library.

## Fixed

 - Converting 1 or 2 page pdfs no longer results in an error.
 - Fixed a bug where a pdf with a multiple of 4 pages would get additional empty pages.

### Removed

 - Removed downloadjs library and all reference to it.

## [1.0.0] - 2021-02-08

### Added

- Everything