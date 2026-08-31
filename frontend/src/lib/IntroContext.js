import { createContext } from "react";

// Lets Hero (rendered deep under Layout's <Outlet/>, on the landing route
// only) and the nav's corner logo (rendered by Layout itself) coordinate
// the same "big wordmark in the hero, then shrink into the nav corner"
// moment via a shared framer-motion layoutId — without Layout needing to
// render Hero directly. Default is "already done" so any route that isn't
// the landing page (where nothing ever flips this) gets the settled state.
export const IntroContext = createContext({ introDone: true, setIntroDone: () => {} });
