import { BaseLoader, PageResourceStatus } from "./loader"
import { findPath } from "./find-path"

class DevLoader extends BaseLoader {
  constructor(syncRequires, matchPaths) {
    const loadComponent = (chunkName, key = `components`, retry = 0) => {
      console.log(
        `loadComponent #${retry + 1}`,
        { chunkName, key },
        { ...this.syncRequires }
      )
      const mod = this.syncRequires[key][chunkName]
      const interval = 500
      const retryDuration = 5000
      if (!mod && retry < Math.ceil(retryDuration / interval)) {
        // that might be after hot reload when webpack hot update wasn't handled yet
        return new Promise(resolve =>
          setTimeout(() => {
            this.loadComponent(chunkName, key, retry + 1).then(resolve)
          }, 500)
        )
      }

      return Promise.resolve(mod)
    }
    super(loadComponent, matchPaths)

    this.syncRequires = syncRequires
  }

  loadPage(pagePath) {
    const realPath = findPath(pagePath)
    return super.loadPage(realPath).then(result =>
      require(`./socketIo`)
        .getPageData(realPath)
        .then(() => result)
    )
  }

  loadPageDataJson(rawPath) {
    return super.loadPageDataJson(rawPath).then(data => {
      // when we can't find a proper 404.html we fallback to dev-404-page
      // we need to make sure to mark it as not found.
      if (
        data.status === PageResourceStatus.Error &&
        rawPath !== `/dev-404-page/`
      ) {
        console.error(
          `404 page could not be found. Checkout https://www.gatsbyjs.org/docs/add-404-page/`
        )
        return this.loadPageDataJson(`/dev-404-page/`).then(result =>
          Object.assign({}, data, result)
        )
      }

      return data
    })
  }

  doPrefetch(pagePath) {
    return Promise.resolve(require(`./socketIo`).getPageData(pagePath))
  }
}

export default DevLoader
