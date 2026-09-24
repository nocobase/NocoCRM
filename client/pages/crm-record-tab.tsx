// The child route that gives a record page's tab its address
// (/crm/accounts/<id>/contacts). The page draws the tab itself, because the
// same detail components also render in the record drawer, where the tab is
// the drawer's own and must not change the page's address; so the route only
// names the tab, and this renders nothing in the page's outlet.
export default function CrmRecordTab(): null {
  return null;
}
