/** Reading destinations are independent of the active Being conversation. */
export const placeGroups = {
  social: { title: "交流", initial: "mail", views: [
    ["mail", "私信"], ["firesides", "围炉"], ["bonfire", "篝火"],
    ["contacts", "通讯录"], ["announcements", "公告"],
  ] },
  reading: { title: "阅读", initial: "scrolls", views: [
    ["scrolls", "卷轴"], ["embers", "书架"], ["seeds", "花园"],
  ] },
  tools: { title: "工具库", initial: "kits", views: [["kits", "工具库"]] },
} as const;
export type PlaceGroup = keyof typeof placeGroups;
export function groupForView(view: string): PlaceGroup | undefined {
  return (Object.keys(placeGroups) as PlaceGroup[]).find(group =>
    placeGroups[group].views.some(([key]) => key === view));
}
