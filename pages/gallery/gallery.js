const {
  getUser,
  createHall,
  updateHall,
  deleteHalls,
  formatStat
} = require('../../services/user-service')

const getHallItems = (user, hall) => {
  return user.items.filter((item) => item.hallId === hall.id || item.hall === hall.name)
}

const getMainHallItems = (user) => {
  return user.items.filter((item) => (item.hall || '主馆') === '主馆')
}

Page({
  data: {
    mainHallCount: '000',
    mainHallUrl: '/pages/showcase/showcase?hall=%E4%B8%BB%E9%A6%86',
    subHalls: [],
    coverOptions: [],
    creatorVisible: false,
    editingHallId: '',
    hallName: '',
    hallDescription: '',
    selectedCover: '',
    creating: false,
    selectingHalls: false,
    selectedHallIds: [],
    selectedHallMap: {},
    selectedHallCount: 0,
    toast: ''
  },

  async onShow() {
    await this.loadGallery()
  },

  async loadGallery() {
    const user = await getUser()
    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    const coverOptions = user.items
      .filter((item) => item.image)
      .reduce((images, item) => images.includes(item.image) ? images : [...images, item.image], [])
      .slice(0, 12)
    const subHalls = user.halls.map((hall) => {
      const items = getHallItems(user, hall)
      const firstPhoto = items.find((item) => item.image)
      return {
        ...hall,
        count: items.length,
        displayCover: hall.coverImage || (firstPhoto ? firstPhoto.image : ''),
        firstItem: items[0] || null
      }
    })

    this.setData({
      mainHallCount: formatStat(getMainHallItems(user).length),
      mainHallUrl: '/pages/showcase/showcase?hall=%E4%B8%BB%E9%A6%86',
      subHalls,
      coverOptions
    })
  },

  openCreator() {
    this.setData({
      creatorVisible: true,
      hallName: '',
      hallDescription: '',
      selectedCover: '',
      editingHallId: '',
      creating: false
    })
  },

  handleTutorialAction(e) {
    if (e.detail.stepId === 'create-gallery') this.openCreator()
    if (e.detail.stepId === 'go-to-summary') {
      wx.redirectTo({ url: '/pages/summary/summary' })
    }
  },

  closeCreator() {
    if (this.data.creating) return
    this.setData({ creatorVisible: false })
    const guide = this.selectComponent && this.selectComponent('#museumGuide')
    if (guide && guide.syncGuide) guide.syncGuide()
  },

  noop() {},

  updateHallName(e) {
    this.setData({ hallName: e.detail.value })
  },

  updateHallDescription(e) {
    this.setData({ hallDescription: e.detail.value })
  },

  chooseDefaultCover() {
    this.setData({ selectedCover: '' })
  },

  chooseCover(e) {
    this.setData({ selectedCover: e.currentTarget.dataset.image })
  },

  async submitHall() {
    const hallName = this.data.hallName.trim()
    if (!hallName) {
      this.notice('请先为副馆取一个名字')
      return
    }
    if (this.data.creating) return

    this.setData({ creating: true })
    try {
      const editingHallId = this.data.editingHallId
      const payload = {
        name: hallName,
        description: this.data.hallDescription,
        coverImage: this.data.selectedCover
      }
      if (editingHallId) await updateHall(editingHallId, payload)
      else await createHall(payload)
      this.setData({ creatorVisible: false, creating: false, editingHallId: '' })
      await this.loadGallery()
      if (!editingHallId) await this.completeGuideStep('create-gallery')
      if (editingHallId) this.cancelHallSelection()
      this.notice(editingHallId ? '副馆已更新' : '副馆已创建')
    } catch (error) {
      this.setData({ creating: false })
      this.notice(error.message === 'Hall name already exists' ? '已经有同名副馆了' : (this.data.editingHallId ? '修改失败，请重试' : '创建失败，请重试'))
    }
  },

  completeGuideStep(stepId) {
    const guide = this.selectComponent && this.selectComponent('#museumGuide')
    return guide && guide.completeStep ? guide.completeStep(stepId) : Promise.resolve(false)
  },

  openHall(e) {
    if (this.suppressHallTapUntil && Date.now() < this.suppressHallTapUntil) return
    const hall = this.data.subHalls[e.currentTarget.dataset.index]
    if (!hall) return

    if (this.data.selectingHalls) {
      this.toggleHallSelection(hall.id)
      return
    }
    wx.navigateTo({
      url: `/pages/showcase/showcase?hall=${encodeURIComponent(hall.name)}&hallId=${encodeURIComponent(hall.id)}`
    })
  },

  handleHallLongPress(e) {
    const hall = this.data.subHalls[e.currentTarget.dataset.index]
    if (!hall) return
    this.suppressHallTapUntil = Date.now() + 500
    const selectedHallMap = this.data.selectingHalls ? { ...this.data.selectedHallMap } : {}
    selectedHallMap[hall.id] = true
    const selectedHallIds = Object.keys(selectedHallMap)
    this.setData({
      selectingHalls: true,
      selectedHallMap,
      selectedHallIds,
      selectedHallCount: selectedHallIds.length,
      creatorVisible: false
    })
  },

  toggleHallSelection(hallId) {
    const selectedHallMap = { ...this.data.selectedHallMap }
    if (selectedHallMap[hallId]) delete selectedHallMap[hallId]
    else selectedHallMap[hallId] = true
    const selectedHallIds = Object.keys(selectedHallMap)
    this.setData({ selectedHallMap, selectedHallIds, selectedHallCount: selectedHallIds.length })
  },

  cancelHallSelection() {
    this.setData({
      selectingHalls: false,
      selectedHallIds: [],
      selectedHallMap: {},
      selectedHallCount: 0
    })
  },

  editSelectedHall() {
    if (this.data.selectedHallCount !== 1) {
      this.notice(this.data.selectedHallCount ? '一次只能编辑一个副馆' : '请先选择一个副馆')
      return
    }
    const hallId = this.data.selectedHallIds[0]
    const hall = this.data.subHalls.find((item) => item.id === hallId)
    if (!hall) return
    this.setData({
      creatorVisible: true,
      editingHallId: hall.id,
      hallName: hall.name || '',
      hallDescription: hall.description || '',
      selectedCover: hall.coverImage || '',
      creating: false
    })
  },

  confirmDeleteHalls() {
    if (!this.data.selectedHallCount) {
      wx.showToast({ title: '请先选择副馆', icon: 'none' })
      return
    }
    wx.showModal({
      title: '删除副馆',
      content: `确定删除选中的 ${this.data.selectedHallCount} 个副馆吗？馆内展品会移回主馆。`,
      confirmText: '删除',
      confirmColor: '#9a503e',
      success: async (result) => {
        if (!result.confirm) return
        try {
          const deleted = await deleteHalls(this.data.selectedHallIds)
          this.cancelHallSelection()
          await this.loadGallery()
          this.notice(`已删除 ${deleted.deletedCount} 个副馆`)
        } catch (error) {
          this.notice('删除失败，请重试')
        }
      }
    })
  },

  notice(toast) {
    this.setData({ toast })
    setTimeout(() => this.setData({ toast: '' }), 1800)
  }
})
