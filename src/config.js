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
//     External web pages shown inside the Gramps Web interface, each with its
//     own link in the side navigation. Example:
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
