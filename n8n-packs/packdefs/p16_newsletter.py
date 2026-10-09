STORY_COLS = ["story_id", "created_at", "title", "link", "source", "published", "summary", "score", "status", "editor_note", "drafted_at"]
PACK = dict(
    slug="newsletter-research-publishing", num=16, short="Newsletter", name="Newsletter Research & Publishing",
    buyer="Solo newsletter operators and small editorial teams",
    price=dict(lite=29, pro=49),
    cfg=dict(business_name="YOUR NEWSLETTER", newsletter_name="YOUR NEWSLETTER", editor_email="editor@example.com",
             feeds=["https://hnrss.org/frontpage", "https://www.nasa.gov/rss/dyn/breaking_news.rss"],
             include_keywords=[], exclude_keywords=["sponsored", "advertisement"], max_age_days=7, max_items=10, max_new_per_run=30,
             intro_text=""),
    sheets={},
    flows=[
        dict(id="collect", kind="rss", title="Collect Stories", lite=True, cron="0 6 * * *", rt={}, columns={"Stories": STORY_COLS}),
        dict(id="approve", kind="event", title="Approve Or Reject Story", lite=True, hook="newsletter-approve",
             rt=dict(
                 sheet="Stories", key_col="story_id", key_field="story_id",
                 fields=[dict(key="story_id", required=True, sample="Sabc123"),
                         dict(key="status", type="select", required=True, sample="approved", options=["approved", "rejected"]),
                         dict(key="editor_note", max_length=300, sample="Why it matters: affects our readers' budgets.")])),
        dict(id="review", kind="digest", title="Stories Waiting For Review", lite=False, cron="30 6 * * *",
             rt=dict(
                 mode="list", sources=[dict(name="stories", sheet="Stories", key_col="story_id")],
                 list=dict(source="stories", where=[dict(field="status", equals="new")], date_col="created_at", within_days=0, to_cfg="editor_email",
                           columns=["title", "source", "published", "score", "story_id"]),
                 subject="{{count}} new stories to review", intro="Approve or reject each story (status column or the approve webhook). Higher score = more keyword matches."),
             test_rows=dict(stories=[dict(story_id="S1", title="A", source="x.com", published="2026-10-11", score="2", status="new", created_at="2026-10-12"),
                                     dict(story_id="S2", title="B", source="y.com", published="2026-10-10", score="0", status="approved", created_at="2026-10-11")]), expect_count=1),
        dict(id="build", kind="newsletter", title="Build Newsletter Draft", lite=True, cron="0 9 * * 4", rt={}, columns={"Stories": STORY_COLS}),
    ],
    listing=dict(title="n8n Newsletter Research Automation | RSS Story Collection, Dedupe, Editor Approval, Weekly Draft | Google Sheets + Gmail",
                 hook="Collect, filter and organize the week's stories automatically, then get a ready-to-edit draft."),
    notes=[
        "Feeds, keywords and limits are set in the Config node. Replace the example feeds with your own.",
        "Stories keep only the title, link, source and a short (300 character) plain-text snippet from the feed, with a link back to the source. Check each source's terms before republishing excerpts, and write your own summaries where required.",
        "The weekly workflow creates a DRAFT email in the editor's Gmail. It never sends to subscribers. Paste the draft into your email platform (Substack, Beehiiv, Mailchimp...) and add your unsubscribe link.",
        "No AI summarization is used. Summaries are the feed's own text, shortened.",
    ],
    limits=["Duplicate detection is by link (tracking parameters removed). Syndicated copies with different links can slip through.",
            "RSS feeds that return only titles produce stories with empty summaries."],
)
