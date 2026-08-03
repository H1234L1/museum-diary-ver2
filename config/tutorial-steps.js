const TUTORIAL_STEPS = [
  {
    id: 'collect-first-exhibit',
    route: 'pages/index/index',
    title: '先收藏一件展品',
    message: '接下来我会标出首页的收藏入口。请亲自点击亮起的位置，把第一段人生记忆放进博物馆。',
    actionLabel: '指出收藏入口',
    targetSelector: '.collect-card',
    targetPadding: 12,
    focusHint: '请点击「收藏一件展品」',
    placement: 'bottom'
  },
  {
    id: 'learn-recording',
    route: 'pages/record/record',
    title: '亲手写下这一刻',
    message: '照片、文字和声音都可以成为展品。先点击我标出的书写区域，亲手开始这次记录。',
    actionLabel: '指出书写区域',
    targetSelector: '.composer',
    targetPadding: 10,
    focusHint: '请点击亮起的书写区域',
    placement: 'top'
  },
  {
    id: 'create-gallery',
    route: 'pages/gallery/gallery',
    title: '为记忆创建一间副馆',
    message: '副馆可以收藏一组特别的记忆。请点击我标出的空展位，亲自打开创建页面。',
    actionLabel: '指出创建入口',
    targetSelector: '.create-hall-card',
    targetPadding: 10,
    focusHint: '请点击「创建副馆」',
    placement: 'bottom'
  },
  {
    id: 'discover-reports',
    route: 'pages/summary/summary',
    title: '回看每个月的收藏',
    message: '月报会整理这个月留下的展品。请点击本月报告，完成最后一步。',
    actionLabel: '指出本月报告',
    targetSelector: '.view-report-button',
    targetPadding: 10,
    focusHint: '请点击「查看本月月报」',
    placement: 'bottom',
    final: true
  }
]

module.exports = { TUTORIAL_STEPS }
