// Runtime configuration for the Gramps Web frontend.
//
// This file is served as-is (it is not bundled), so deployers can replace it
// to configure the frontend without rebuilding. Supported options include:
//
//   embeddedPages: external web pages shown inside the Gramps Web interface,
//     each with its own link in the side navigation. Example:
//
//     embeddedPages: [
//       {
//         id: 'wiki',                  // route: /embed/wiki
//         title: 'Family Wiki',        // navigation label
//         url: 'https://wiki.example.org/',
//         icon: 'M12 2C6.48 2 …',      // optional SVG path (24×24 viewBox),
//                                      // e.g. from materialdesignicons.com
//         iconUrl: '/icons/wiki.svg',  // optional monochrome image, used
//                                      // instead of `icon`
//         after: 'map',                // optional: place the link after (or
//                                      // with `before`, before) the navigation
//                                      // item with this id. Built-in ids:
//                                      // home, blog, tree, timeline, map, dna,
//                                      // lists, media, chat, recent, bookmarks,
//                                      // tasks, reports, export, revisions,
//                                      // notifications. Another embedded
//                                      // page's id also works. Defaults to the
//                                      // end of the first navigation group.
//       },
//     ],
//
// The embedded site must allow being framed by the Gramps Web origin
// (X-Frame-Options / Content-Security-Policy frame-ancestors).
window.grampsjsConfig = {}
