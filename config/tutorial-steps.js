const TUTORIAL_STEPS = [
  {
    id: 'collect-first-exhibit',
    route: 'pages/index/index',
    title: '先收藏一件展品',
    message: '从首页的收藏入口开始，把第一段人生记忆放进博物馆。',
    targetSelector: '.collect-card',
    targetPadding: 12,
    focusHint: '点击「收藏一件展品」',
    placement: 'bottom'
  },
  {
    id: 'add-first-photo',
    route: 'pages/record/record',
    title: '先放入示例照片',
    message: '第一次收藏先使用博物馆准备的示例照片。完成引导后，你就可以从相册或相机添加自己的照片。',
    targetSelector: '.museum-frame',
    targetPadding: 10,
    focusHint: '点击画框使用示例照片',
    placement: 'top',
    deferAdvance: true
  },
  {
    id: 'introduce-voice-recording',
    route: 'pages/record/record',
    title: '也可以用声音记录',
    message: '除了文字，你也可以点击这里切换到语音记录，把当时的声音收藏下来。',
    targetSelector: '.mode-toggle',
    targetPadding: 10,
    focusHint: '这里也可以使用语音记录 · 轻触继续',
    placement: 'top'
  },
  {
    id: 'write-first-text',
    route: 'pages/record/record',
    title: '写下这一刻',
    message: '在书写区域记录照片背后的故事。停止输入 1 秒后，我会带你选择收藏展馆。',
    targetSelector: '.composer',
    targetPadding: 10,
    focusHint: '点击并写下一段文字',
    placement: 'top',
    deferAdvance: true
  },
  {
    id: 'select-main-hall',
    route: 'pages/record/record',
    title: '选择收藏展馆',
    message: '每件展品都需要一个归属。第一次先选择主馆，之后也可以收藏到你创建的副馆。',
    targetSelector: '.hall-option',
    targetPadding: 10,
    focusHint: '选择「主馆」继续',
    placement: 'top',
    deferAdvance: true
  },
  {
    id: 'save-first-exhibit',
    route: 'pages/record/record',
    title: '把记忆收入馆藏',
    message: '照片和文字已经准备好了。点击入藏，完成你的第一件展品。',
    targetSelector: '.submit-button',
    targetPadding: 10,
    focusHint: '点击「入藏」',
    placement: 'top',
    deferAdvance: true
  },
  {
    id: 'back-from-detail',
    route: 'pages/detail/detail',
    title: '返回展品目录',
    message: '展品已经入藏。点击左上角返回，看看它在主馆中的位置。',
    targetSelector: '.back',
    targetPadding: 12,
    focusHint: '点击左上角返回',
    placement: 'bottom'
  },
  {
    id: 'back-to-gallery',
    route: 'pages/hall/hall',
    title: '回到展厅',
    message: '再点击一次左上角返回，回到完整的展厅页面。',
    targetSelector: '.back',
    targetPadding: 12,
    focusHint: '继续点击左上角返回',
    placement: 'bottom'
  },
  {
    id: 'create-gallery',
    route: 'pages/gallery/gallery',
    title: '为记忆创建一间副馆',
    message: '副馆可以收藏一组特别的记忆。点击空展位并完成副馆创建。',
    targetSelector: '.create-hall-card',
    targetPadding: 10,
    focusHint: '点击「创建副馆」',
    placement: 'bottom',
    deferAdvance: true
  },
  {
    id: 'go-to-summary',
    route: 'pages/gallery/gallery',
    title: '去总结看看',
    message: '副馆已经建立。点击底部的总结，回看你的收藏。',
    targetComponent: '#museumNav',
    targetSelector: '.nav-summary',
    targetPadding: 9,
    focusHint: '点击「总结」',
    placement: 'top'
  },
  {
    id: 'discover-reports',
    route: 'pages/summary/summary',
    title: '回看每个月的收藏',
    message: '月报会整理这个月留下的展品。点击本月报告，完成新手引导。',
    targetSelector: '.view-report-button',
    targetPadding: 10,
    focusHint: '点击「查看本月月报」',
    placement: 'bottom',
    final: true
  }
]

module.exports = { TUTORIAL_STEPS }
