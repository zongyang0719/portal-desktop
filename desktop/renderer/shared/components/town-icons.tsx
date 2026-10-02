import type { PlaceView } from "../lib/navigation";

// Original Town navigation artwork, shared by the chat shortcuts and Desktop rail.
export const townPlaces = [
  {
    view: "bonfire" as PlaceView,
    label: "篝火",
    icon: (
      <>
        <path d="M12 3c1 4-4 5-4 9 0 1 .5 2 1 2 0-3 3-3 4-6 4 3 6 6 5 9a6.5 6.5 0 0 1-12-1c-1-5 3-8 6-13Z" />
      </>
    ),
  },
  {
    view: "firesides" as PlaceView,
    label: "围炉",
    icon: (
      <>
        <circle cx="8" cy="7" r="3" />
        <path d="M2 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 4 5v3" />
      </>
    ),
  },
  {
    view: "mail" as PlaceView,
    label: "私信",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
  },
  {
    view: "seeds" as PlaceView,
    label: "花园",
    icon: (
      <>
        <path d="M12 21V11M12 15C5 15 3 11 3 6c6 0 9 3 9 9ZM12 11c0-6 3-9 9-9 0 6-3 9-9 9Z" />
      </>
    ),
  },
  {
    view: "embers" as PlaceView,
    label: "书架",
    icon: (
      <>
        <path d="M12 5v16M12 5C9 3 6 3 3 4v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-3-1-6-1-9 1Z" />
      </>
    ),
  },
  {
    view: "scrolls" as PlaceView,
    label: "卷轴",
    icon: (
      <>
        <path d="M7 3h12a2 2 0 0 1 2 2v3h-4V5a2 2 0 0 1 4 0M7 3a2 2 0 0 0-2 2v14a2 2 0 0 1-4 0v-3h12v3a2 2 0 0 0 4 0V7M3 21h12M8 8h5M8 12h5" />
      </>
    ),
  },
  {
    view: "kits" as PlaceView,
    label: "工具库",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
  },
  {
    view: "contacts" as PlaceView,
    label: "通讯录",
    icon: <><rect x="5" y="3" width="16" height="18" rx="2" /><circle cx="13" cy="9" r="2" /><path d="M9 17v-1a4 4 0 0 1 8 0v1M2 7h4M2 12h4M2 17h4" /></>,
  },
];
