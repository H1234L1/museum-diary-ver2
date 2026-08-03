const TUTORIAL_STEPS = [
  {
    id: 'collect-first-exhibit',
    route: 'pages/index/index',
    title: '先收藏一件展品',
    message: '点击首页的「收藏一件展品」，可以把照片、文字或声音放进人生博物馆。',
    actionLabel: '去添加展品',
    nextUrl: '/pages/record/record?new=1',
    placement: 'bottom'
  },
  {
    id: 'learn-recording',
    route: 'pages/record/record',
    title: '记录属于你的这一刻',
    message: '你可以修改日期，再选择照片、写下一段话或录一段声音。完成后点击「入馆」保存。',
    actionLabel: '下一步',
    nextUrl: '/pages/gallery/gallery',
    placement: 'top'
  },
  {
    id: 'create-gallery',
    route: 'pages/gallery/gallery',
    title: '为记忆创建一间副馆',
    message: '副馆区域的「＋」可以创建新展馆。取一个名字、选择封面，以后再慢慢放入展品。',
    actionLabel: '去看月报',
    nextUrl: '/pages/summary/summary',
    placement: 'bottom'
  },
  {
    id: 'discover-reports',
    route: 'pages/summary/summary',
    title: '回看每个月的收藏',
    message: '这里会整理本月月报和所有过往月报。随着馆藏增加，你会看到属于自己的月度故事。',
    actionLabel: '完成教程',
    nextUrl: '/pages/index/index',
    placement: 'bottom',
    final: true
  }
]

module.exports = { TUTORIAL_STEPS }
