// The named people behind the insight widgets' demo data.
//
// TEMPORARY — see the note in `seed.ts`. In Phase 2 the roster comes from the
// live endpoint's `rows[].name` / `user_id`, scoped by the caller's own RBAC
// (superadmin → all active users; manager → self + reports).
//
// The reference dashboard shipped a 15-persona role switcher (`?role=`) and a
// `visibleUsers(roleId)` resolver that faked "view as another role". That is
// deliberately NOT ported: this app resolves scope from the authenticated user
// on the server, and a client-side persona switch would both contradict real
// permissions and imply a "view as" power that does not exist.
//
// What remains is the flat roster. Phase 1 therefore always shows everyone —
// equivalent to the reference's superadmin view.

export interface OrgUser {
  name: string
  title: string
  vertical: 'channel' | 'ec'
}

export const USERS: Record<string, OrgUser> = {
  // Channel vertical
  'Amit Patel': { name: 'Amit Patel', title: 'Channel Partner Manager', vertical: 'channel' },
  'Karan Malhotra': { name: 'Karan Malhotra', title: 'Senior Account Manager', vertical: 'channel' },
  'Divya Iyer': { name: 'Divya Iyer', title: 'Account Manager', vertical: 'channel' },
  'Rohit Kulkarni': { name: 'Rohit Kulkarni', title: 'Account Manager', vertical: 'channel' },
  'Sneha Desai': { name: 'Sneha Desai', title: 'Branch Manager', vertical: 'channel' },
  'Manish Rao': { name: 'Manish Rao', title: 'Relationship Manager', vertical: 'channel' },
  'Farah Khan': { name: 'Farah Khan', title: 'Relationship Manager', vertical: 'channel' },
  // End-customer vertical
  'Rahul Verma': { name: 'Rahul Verma', title: 'End Customer Manager', vertical: 'ec' },
  'Nikhil Jain': { name: 'Nikhil Jain', title: 'KAM', vertical: 'ec' },
  'Tanvi Joshi': { name: 'Tanvi Joshi', title: 'ISR', vertical: 'ec' },
  'Imran Qureshi': { name: 'Imran Qureshi', title: 'ISR', vertical: 'ec' },
  'Pooja Shetty': { name: 'Pooja Shetty', title: 'BDM', vertical: 'ec' },
  'Arjun Menon': { name: 'Arjun Menon', title: 'BDE', vertical: 'ec' },
  'Sana Sheikh': { name: 'Sana Sheikh', title: 'BDE', vertical: 'ec' },
  'Vikram Singh': { name: 'Vikram Singh', title: 'Presales', vertical: 'ec' },
}

export const ALL_USERS: string[] = Object.keys(USERS)

/** Every distinct job title on the roster, for the Sales Team title filter. */
export const USER_TITLES: string[] = [...new Set(ALL_USERS.map((n) => USERS[n]?.title ?? ''))]
  .filter(Boolean)
  .sort()
