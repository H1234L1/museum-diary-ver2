Page({
  data: {
    halls: [
      { name: '主馆', count: 32 },
      { name: '夏日碎片', count: 12 },
      { name: '与朋友们的时光', count: 8 },
      { name: '旅行收藏夹', count: 6 }
    ]
  },
  back() { wx.navigateBack() },
  addHall() {
    wx.showModal({
      title: '新建副馆',
      editable: true,
      placeholderText: '输入展厅名称',
      success: ({ confirm, content }) => {
        if (confirm && content) this.setData({ halls: [...this.data.halls, { name: content, count: 0 }] })
      }
    })
  },
  editHall(e) {
    const index = e.currentTarget.dataset.index
    wx.showActionSheet({
      itemList: ['重命名', '设置封面', '删除展厅'],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) this.rename(index)
        else wx.showToast({ title: tapIndex === 1 ? '请选择封面' : '演示版未执行删除', icon: 'none' })
      }
    })
  },
  rename(index) {
    wx.showModal({
      title: '重命名展厅',
      editable: true,
      placeholderText: this.data.halls[index].name,
      success: ({ confirm, content }) => {
        if (!confirm || !content) return
        const halls = [...this.data.halls]
        halls[index] = { ...halls[index], name: content }
        this.setData({ halls })
      }
    })
  }
})
