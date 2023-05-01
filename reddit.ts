type Enumerate<N extends number, Acc extends number[] = []> =
  Acc["length"] extends N ? Acc[number]
    : Enumerate<N, [...Acc, Acc["length"]]>;

/**
 * Type that allows you to restrict to numbers within a specific range (inclusive)
 * source: https://stackoverflow.com/a/39495173
 */
type IntRange<F extends number, T extends number> = Exclude<
  Enumerate<T>,
  Enumerate<F>
>;

/**
 * Type that only allows ones one of the provided properties to exist
 * source: https://stackoverflow.com/a/75829006
 */
type SingleProp<T extends Record<string, unknown>> = {
  [K in keyof T]-?: (
    & { [P in K]-?: T[K] }
    & { [P in keyof T as P extends K ? never : P]?: never }
  );
}[keyof T];

interface RedditListingRequest {
  /**
   * before/after - only one should be specified. these indicate the fullname of
   * an item in the listing to use as the anchor point of the slice.
   *
   * fullname of a thing. https://www.reddit.com/dev/api/#fullnames
   */
  after?: string;

  /**
   * before/after - only one should be specified. these indicate the fullname of
   * an item in the listing to use as the anchor point of the slice.
   *
   * fullname of a thing. https://www.reddit.com/dev/api/#fullnames
   */
  before?: string;

  /**
   * the maximum number of items to return in this slice of the listing.
   * (default: 25, maximum: 100)
   */
  limit?: number;

  /**
   * a positive integer (default: 0)
   *
   * the number of items already seen in this listing. on the html site, the
   * builder uses this to determine when to give values for `before` and `after`
   * in the response.
   */
  count?: number;

  /**
   * optional parameter; if `all` is passed, filters such as "hide links that I
   * have voted on" will be disabled.
   */
  show?: "all";
}

/**
 * Reddit's Base Class Object for their responses
 * https://github.com/reddit-archive/reddit/wiki/JSON
 */
interface RedditResponseThing<T> {
  id: string;
  /**
   * Fullname of comment, e.g. "t1_c3v7f8u"
   */
  name: string;

  /**
   * All things have a kind. The `kind` is a string identifier that denotes the
   * object's `type`. Some examples: `Listing`, `more`, `t1`, `t2`
   */
  kind: string;

  /**
   * A custom data structure used to hold valuable information. This object's format will follow the data structure
   * respective of its kind. See below for specific structures.
   */
  data: Record<string, T>;
}

/**
 * https://github.com/reddit-archive/reddit/wiki/JSON#listing
 */
interface RedditResponseListing<T> {
  before: string | null;
  after: string | null;

  /**
   * This modhash is not the same modhash provided upon login. You do not need
   * to update your user's modhash everytime you get a new modhash. You can
   * reuse the modhash given upon login.
   */
  modhash: string;

  children: RedditResponseThing<T>[];
}

/**
 * Request paramters for all of the following GET `/user/username/*` endpoints
 * - /user/username/overview
 * - /user/username/submitted
 * - /user/username/comments
 * - /user/username/upvoted
 * - /user/username/downvoted
 * - /user/username/hidden
 * - /user/username/saved
 * - /user/username/gilded
 *
 * https://www.reddit.com/dev/api/#GET_user_{username}_{where}
 */
interface GetUserItemRequestParams extends RedditListingRequest {
  context: IntRange<2, 10>;

  sort: "hot" | "new" | "top" | "controversial";

  t: "hour" | "day" | "week" | "month" | "year" | "all";

  type: "links" | "comments";

  /**
   * the name of an existing user
   */
  username: string;

  /**
   * (optional) expand subreddits
   */
  sr_detail?: boolean;
}

interface RedditComment {
  /**
   * who approved this comment. `null` if nobody or you are not a mod
   */
  approved_by: string | null;
  /**
   * the account name of the poster
   */
  author: string;
  /**
   * the CSS class of the author's flair. subreddit specific
   */
  author_flair_css_class: string;
  /**
   * the text of the author's flair. subreddit specific
   */
  author_flair_text: string;
  /**
   * who removed this comment. null if nobody or you are not a mod
   */
  banned_by: string | null;
  /**
   * the raw text. this is the unformatted text which includes the raw markup
   * characters such as ** for bold. <, >, and & are escaped.
   */
  body: string;
  /**
   * the formatted HTML text as displayed on reddit. For example, text that is
   * emphasised by * will now have <em> tags wrapping it. Additionally, bullets
   * and numbered lists will now be in HTML list format. NOTE: The HTML string
   * will be escaped. You must unescape to get the raw HTML.
   */
  body_html: string;
  /**
   * false if not edited, edit date in UTC epoch-seconds otherwise.
   * NOTE: for some old edited comments on reddit.com, this will be set to true
   * instead of edit date.
   */
  edited: boolean | string;
  /**
   * the number of times this comment received reddit gold
   */
  gilded: number;
  /**
   * how the logged-in user has voted on the comment - True = upvoted, False = downvoted, null = no vote
   */
  likes: boolean | null;

  /**
   * present if the comment is being displayed outside its thread
   * (user pages, /r/subreddit/comments/.json, etc.).
   * Contains the author of the parent link
   */
  link_author: string;
  /**
   * ID of the link this comment is in
   */
  link_id: string;
  /**
   * present if the comment is being displayed outside its thread
   * (user pages, /r/subreddit/comments/.json, etc.). Contains the title of the parent link
   */
  link_title: string;
  /**
   * present if the comment is being displayed outside its thread
   * (user pages, /r/subreddit/comments/.json, etc.).
   * Contains the URL of the parent link
   */
  link_url: string;
  /**
   * how many times this comment has been reported, null if not a mod
   */
  num_reports: number;
  /**
   * ID of the thing this comment is a reply to, either the link or a comment in it
   */
  parent_id: string;
  /**
   * A list of replies to this comment
   */
  thing: RedditResponseThing[];
  /**
   * true if this post is saved by the logged in user
   */
  saved: boolean;
  /**
   * the net-score of the comment
   */
  score: number;
  /**
   * Whether the comment's score is currently hidden.
   */
  score_hidden: boolean;
  /**
   * subreddit of thing excluding the /r/ prefix. "pics"
   */
  subreddit: string;
  /**
   * the id of the subreddit in which the thing is located
   */
  subreddit_id: string;
  /**
   * to allow determining whether they have been distinguished by moderators/admins.
   * - null = not distinguished.
   * - moderator = the green [M].
   * - admin = the red [A].
   * - special = various other special distinguishes http://redd.it/19ak1b
   */
  distinguished: null | "moderator" | "admin" | "special";
}
