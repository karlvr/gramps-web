// Runtime configuration for the Gramps Web frontend.
//
// Deployers can replace this file to configure the frontend without rebuilding.
// Every option is optional; unset options keep the defaults noted below.
//
// Login
//
//   hideRegisterLink: true
//     Hide the "Register new account" button on the login page.
//
//   loginRedirect: 'https://sso.example.org/'
//     Send unauthenticated users to this URL instead of showing the login
//     page, e.g. for a single-sign-on portal. The login page itself remains
//     reachable directly at /login.
//
// Navigation
//
//   hideDNALink: true
//     Hide the DNA item in the side navigation and its keyboard shortcut.
//
//   embeddedPages: [...]
//     Additional pages shown inside the Gramps Web interface, each with its
//     own link in the side navigation. A page is either an external web page
//     (`url`, shown in a frame) or a custom page (`module`, see below).
//     Example:
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
//     The embedded site must allow being framed by the Gramps Web origin
//     (X-Frame-Options / Content-Security-Policy frame-ancestors).
//
//     A custom page is a JavaScript module served alongside this file (for
//     example mounted at `/app/static/plugins/stats.js`) whose default export
//     is a custom element class:
//
//     embeddedPages: [
//       {id: 'stats', title: 'Statistics', module: '/plugins/stats.js'},
//     ]
//
//     The element is rendered in the content area and receives two
//     properties: `appState` (the Gramps Web app state, including
//     `appState.apiGet(...)` and friends for authenticated API access, and
//     `appState.i18n`, `permissions`, `settings`, `dbInfo`) and `subPage`
//     (the route segment after the page id, so `/embed/stats/<subPage>`).
//     The element is created once and kept while other pages are shown.
//     Unlike a framed page, a custom page runs with the same access as
//     Gramps Web itself, including the user's login session — only install
//     modules you trust.
//
// Map
//
//   mapBaseStyleLight: 'https://tiles.openfreemap.org/styles/liberty'
//   mapBaseStyleDark: 'https://tiles.openfreemap.org/styles/dark'
//     MapLibre style JSON URLs for the base map in light and dark mode.
//
//   mapOhmStyle: 'https://www.openhistoricalmap.org/map-styles/main/main.json'
//     MapLibre style JSON URL for the OpenHistoricalMap layer.
//
// System information
//
//   hideResearcherDetails: true
//     Hide the Researcher Information section on the system information page.
window.grampsjsConfig = {}
