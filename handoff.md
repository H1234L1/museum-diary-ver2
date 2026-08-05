# Museum Diary — Project Handoff

Last updated: 2026-08-05

## What we are building

`museum-diary-ver2` is a native WeChat Mini Program called **人生博物馆 / Life Museum**. It turns personal photos, writing, and voice recordings into museum “exhibits” organized into halls. The implementation must use native Mini Program WXML, WXSS, JavaScript, and JSON. Text and interactive UI should be real Mini Program elements rather than screenshots of the supplied designs.

The current active repository is:

`/Users/emily/Desktop/newmuseum/museum-diary-ver2`

Current Git branch: `backend`
Latest commit at the time of this handoff: `6172fa4 Merge pull request #15 from H1234L1/主页跳转展馆`

## Product and design requirements to preserve

- Pages should fill the usable phone screen without surrounding blank space, overflow, or notch/Dynamic Island overlap.
- Use safe-area, status-bar, and WeChat capsule measurements for custom headers.
- The visual language is an elegant warm museum: cream parchment, antique gold, warm wood, subtle texture, soft depth, and restrained shadows.
- Do not use screenshots as complete pages. UI text, buttons, cards, navigation, and backgrounds should be built with native Mini Program code.
- The approved audio-showcase lighting must be preserved: a bright diffused white-gold center beneath the ceiling lamp, smooth radial blending, warm darker unilluminated edges, and no visible yellow triangle or hard geometric boundary.
- The approved audio shelf should remain three-dimensional: perspective top plane, beveled front fascia, supports, contact shadow under the gramophone, and cast shadow beneath the shelf.
- The gramophone must visibly rest on the shelf rather than float.

## What has been achieved

### Application foundation

- Corrected Skyline configuration and registered required Mini Program pages.
- Built full-screen page layouts and a reusable coded bottom navigation bar.
- Added notch-safe custom headers using `wx.getWindowInfo()` and `wx.getMenuButtonBoundingClientRect()`.
- Bottom navigation remains visible on the 记录 and 我的 pages.
- Navigation labels were updated, including 策展 → 总结 and AI建议展厅 → 建议展厅.

### Home, gallery, summary, and report

- Home design fills the phone screen.
- The 展品数量/入馆天数 statistics card is non-clickable.
- 展厅 is scrollable and includes 主馆、副馆、建议展厅 content.
- 主馆 and other hall pages use a three-column thumbnail grid with multiple rows.
- Photo records show image thumbnails; text records show readable excerpts; audio records show a headphone treatment and title.
- Thumbnail taps pass the correct record ID and open the actual exhibit rather than an empty exhibit.
- 月度馆藏报告 opens a dedicated report page rather than a popup.

### Exhibit detail behavior

- Photo, text, and audio exhibit detail variants retrieve the selected record by ID.
- Detail headers respect phone notches and the WeChat capsule.
- After recording, leaving 展品详情 redirects to the recorded hall’s thumbnail grid, defaulting to 主馆.
- Text exhibits use a fixed full-screen parchment display. The page itself does not scroll; long writing scrolls inside the parchment.
- Text exhibits begin with the entry date and do not show a title.
- Text parchment height and bottom actions were adjusted to avoid the system home indicator.
- Bottom showcase actions are now 编辑、留言、分享 from left to right.
- 分享 uses a code-built curved share-arrow icon rather than a diagonal arrow character or picture.

### Audio exhibit showcase

- Replaced the inaccurate code-drawn gramophone with an isolated transparent gramophone asset derived from the supplied `garmaphone.png`.
- Project asset: `assets/art/gramophone-cutout.png`.
- The gramophone uses `aspectFit`, sits on the coded shelf, and has a contact shadow.
- Added the approved soft museum spotlight described above.
- Playback is controlled by one centered circular play/pause button inside the information card.
- Removed all default/filler audio descriptions. If the user writes nothing, the description area is blank.
- The information card was moved downward and the bottom action bubbles were raised.
- Existing `wx.createInnerAudioContext()` playback behavior remains intact.

### Record page

- Rebuilt the 记录 page with the ornate museum frame, coded camera icon, 添加图片 label, expandable 写点什么 textarea, voice/text toggle, press-and-hold WeChat-style recording, date selector, and centered 入藏 button.
- The textarea grows vertically until the available space above the bottom navigation is used, then scrolls internally.
- Audio recording supports finish, cancel by sliding upward, and re-recording.
- Files are persisted through the Mini Program filesystem before saving records.
- Conditional title rule:
  - If an audio file exists and the user wrote no text, pressing 入藏 requires a title in an editable modal.
  - An empty title cannot be confirmed; cancelling aborts submission.
  - In every other case, no title is requested and no automatic title is generated.

## Current local state

The following backend/share work is local and was not committed at the time of this handoff:

- `app.js`
- `pages/detail/detail.js`
- `pages/detail/detail.wxml`
- `project.config.json`
- `services/comment-service.js`
- `services/share-service.js`
- `cloudfunctions/`

Run `git status --short` before making further changes. Preserve unrelated user changes.

## What we are doing now

The current focus is real cross-device exhibit sharing and private one-to-one comments using WeChat Cloud Development. Sharing has been tested successfully. The comment frontend is connected locally, but its two new cloud functions still need deployment before comments will open on a recipient device.

## Planned next work

1. Deploy and test the two new private-comment cloud functions described below.
2. Verify sharing/comment isolation with an owner and at least two different recipient OpenIDs.
3. Build the planned user login/profile layer so owners can distinguish commenters by a safe display identity while authorization remains based on server-derived OpenID.
4. Add share management, comment pagination/moderation, deletion/privacy flows, and production error states.
5. Optimize the Mini Program package and its large gramophone asset after backend behavior is stable.
6. Re-test audio recording/playback and exhibit editing on physical devices after the CloudBase changes.
7. Commit and push verified local changes only when explicitly requested.

## Sharing and private comments — Cloud Development handoff

The requested product behavior is:

- The exhibit owner can open 留言 and read comments sent by every person who received that exhibit share.
- A share recipient can write comments to the owner.
- Recipient threads are one-to-one: each recipient can see only their own comments and must never see comments written by other recipients.
- The comment UI must use the museum visual language rather than a native `wx.showModal` input.

### Cloud environment and collections

- CloudBase is enabled and usable even though the developer does not control the camp teacher's education-account administrator login.
- Environment name: `eduction-cloud1`.
- Environment ID: `eduction-cloud1-6golagre0af9d5e5`.
- Expected project AppID: `wx2fa2d034fa861278`. One DevTools package error reported AppID `wx77faff1a57b51e70`; verify the AppID in DevTools project details before a production upload.
- `app.js` initializes `wx.cloud` against the environment above with `traceUser: true`.
- The following collections were created successfully:
  - `shared_entries`
  - `share_links`
  - `private_comments`
- All three collections are set to `所有用户不可读写`. Keep this setting. Mini Program clients must not query them directly; cloud functions use server-side database privileges.
- Temporary setup functions `setupDatabase` and `setupDatabaseV2` were used to create the collections. They can be removed after all backend work is verified.

### Sharing work completed

- `cloudfunctions/createShare` obtains the trusted caller `OPENID`, validates a safe exhibit snapshot, creates a cryptographically random 64-character share token, and writes `shared_entries` plus `share_links` records.
- `cloudfunctions/getSharedEntry` validates the token, checks enabled/revoked/expiry state, loads the shared snapshot, and returns only safe exhibit fields. It does not return the owner's OpenID.
- `services/share-service.js` uploads photo/audio files to Cloud Storage before sharing. Device-local `wxfile://` paths are never sent to recipients.
- `pages/detail/detail` prepares the share when its action menu opens. The menu displays `准备中` during upload/token creation and enables WeChat sharing when ready.
- `onShareAppMessage()` now shares `/pages/detail/detail?token=...`; it no longer relies on a device-local exhibit ID.
- A recipient loads the exhibit snapshot through `getSharedEntry` on the existing museum-styled detail page.
- Backend truth determines `isSharedViewer`. Non-owner recipients do not see the `•••` menu or its Edit/Share actions; they only see the floating 留言 entry.
- Cross-device sharing reached the intended page successfully in Preview/experience testing.

### Comment work implemented locally

- The old device-local comment prototype in `services/comment-service.js` was replaced with calls to cloud functions.
- `cloudfunctions/addPrivateComment`:
  - accepts a share token and comment text;
  - derives the author from `cloud.getWXContext().OPENID`;
  - verifies that the share is active;
  - rejects the exhibit owner from using the recipient-only write path;
  - stores `shareId`, `sharedEntryId`, `originalEntryId`, `ownerOpenId`, `authorOpenId`, content, and server time;
  - limits comment content to 500 characters.
- `cloudfunctions/getPrivateComments`:
  - for a recipient token, returns only records whose `authorOpenId` matches the caller;
  - for an owner opening the original exhibit, returns comments for that exhibit only when `ownerOpenId` matches the caller;
  - strips all OpenIDs before returning data to the Mini Program.
- The existing museum-style comment bottom sheet remains in place. Recipients get a composer; owners get a read-only received-comment list.

### Current deployment state and immediate next steps

At the last cloud-console check, these remote functions existed:

- `createShare`
- `getSharedEntry`
- `setupDatabase`
- `setupDatabaseV2`
- `speech2text`

The comment UI displayed `留言暂时无法打开` because the frontend called a function that did not yet exist remotely. Complete these steps:

1. Create/deploy local `cloudfunctions/getPrivateComments` using `创建并部署：云端安装依赖（不上传 node_modules）`.
2. Create/deploy local `cloudfunctions/addPrivateComment` using the same option.
3. Upload/deploy the updated `cloudfunctions/getSharedEntry`.
4. Refresh the cloud function list and confirm all three show `已部署`.
5. Recompile/upload a new Preview or experience build before testing on another phone.
6. Test with three distinct real WeChat users: owner, recipient A, and recipient B.
7. Prove that the owner sees A and B's received messages, A sees only A's own messages, and B sees only B's own messages.
8. Add explicit loading/retry, revoked-share, deleted-exhibit, moderation, rate limiting, maximum-history pagination, and offline states.
9. Add share revocation/expiry controls and cleanup for unused Cloud Storage media and duplicate share snapshots.

## Planned login and commenter identity backend

WeChat CloudBase already differentiates callers securely through `OPENID`; do not use a nickname, client-generated viewer ID, or client-supplied OpenID for authorization. The planned login/profile feature is for recognizable display identity and account UX, not the security boundary.

Recommended implementation:

1. Create a `users` collection with `所有用户不可读写`.
2. Add a `loginOrCreateUser` cloud function that derives `OPENID` from `cloud.getWXContext()`, creates/updates the user record, and returns a safe profile without exposing OpenID.
3. Suggested user fields: internal `_id`, `openid` (server-only), `displayName`, `avatarFileId`, `createdAt`, `updatedAt`, profile-consent version, and optional status/moderation fields.
4. Ask for profile information only after an explicit user button/action. Do not treat `wx.login()` or profile consent as proof of authorization; authorization remains the server-derived `OPENID`.
5. Upload selected avatars to Cloud Storage rather than storing temporary local paths.
6. When the owner loads received comments, join each `authorOpenId` to its server-side user profile and return only safe fields such as display name/avatar. Never return raw OpenIDs.
7. Recipients must still receive only their own comment records, even after profiles are added.
8. Decide the product fallback for users who do not create a profile, for example stable labels such as `访客 01`, while keeping those labels private to the exhibit owner.
9. Add profile editing, consent/privacy copy, account-data deletion, and sign-out/local-session clearing flows.
10. Before production, review WeChat privacy declarations for nickname/avatar, uploaded media, comments, and any analytics being collected.

## Backend/account constraints and future speech-to-text

- The education Mini Program was provided by a teacher at a camp, so administrator-level Tencent Cloud account access is not expected.
- Ordinary CloudBase sharing/comments can proceed with current developer access because the environment and cloud functions are already available.
- Tencent Cloud ASR activation on the Mini Program's bound Tencent Cloud main account may not be possible without the teacher/admin.
- A possible future ASR route is a separately owned Tencent Cloud account with a restricted CAM sub-user/API credential used only inside `speech2text`; never put permanent credentials in Mini Program frontend code or Git.
- `speech2text` currently exists as a deployed placeholder and is not a working transcription backend yet.

## Package configuration notes

- The hard Mini Program upload limit encountered was 2 MB; the 1.5 MB message is a performance recommendation.
- `project.config.json` now excludes backend-only `cloudfunctions` and five confirmed unused images from the Mini Program upload package.
- DevTools still reports advisory checks for individual image/audio resources above 200 KB and unused dependency files.
- `assets/art/gramophone-cutout.png` is approximately 672 KB and is the main resource-size warning. Compress it or move appropriate large media to cloud storage later without changing the approved visual appearance.
- When DevTools reports `不应存在无依赖文件`, use `点击查看` and inspect the exact list before excluding anything; some assets may be loaded dynamically.

## Important implementation notes

- Record data lives in `services/user-service.js` and includes `id`, `title`, `date`, `image`, `story`, `audio`, `hall`, `type`, and `createdAt`.
- The detail page accepts `type`, `id`, `from`, and `hall` URL parameters.
- Do not replace the approved audio lighting with the old border-triangle implementation.
- Do not restore filler audio copy such as “这是一段被收藏下来的声音” or “这是一段来自心底的声音…”.
- Do not reintroduce an overlaid play button on the gramophone itself; playback belongs in the information card.
