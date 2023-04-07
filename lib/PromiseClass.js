// 自定义promise函数模块:IIFE
(function (window){
  
  const PENDING = 'pending'
  const RESOLVED = 'resolved'
  const REJECTED = 'rejected'

  class Promise{
    /**
    * Promise构造函数
    * @param {*} excutor 执行器函数（同步执行）
    */
    constructor(excutor){
      // 将当前promise对象保存起来
      const self = this
      self.status = PENDING // 给promise对象指定status属性,初始值为pending
      self.data = undefined // 给promise对象指定一个用于存储结果数据的属性
      self.callbacks = [] //每个元素的结构:{onResolved(){}, onRejected(){}}
      
      function resolve(value) {
        // 如果当前状态不是pending,直接结束
        if (self.status !== PENDING) return
        // 将状态改为resolved
        self.status = RESOLVED
        // 保存value数据
        self.data = value
        // 如果有待执行callback函数,立即异步执行回调onResolved
        if (self.callbacks.length > 0) {
          setTimeout(() => { // 放入队列中执行所有成功的回调
            self.callbacks.forEach(calbacksObj => {
              calbacksObj.onResolved(value) 
            });
          })
        }
      }
      function reject(reason) {
        // 如果当前状态不是pending,直接结束
        if (self.status !== PENDING) return
        // 将状态改为rejected
        self.status = REJECTED
        // 保存value数据
        self.data = reason
        // 如果有待执行callback函数,立即异步执行回调onRejected
        if (self.callbacks.length > 0) {
          setTimeout(() => { // 放入队列中执行所有成功的回调
            self.callbacks.forEach(calbacksObj => {
              calbacksObj.onRejected(reason) 
            });
          })
        }
      }
      // 立即同步执行excutor
      try {
        excutor(resolve, reject)
      } catch(error) { // 如果执行器抛出异常,promise对象变为rejected状态
        reject(error)
      }
    }

      /**
     * Promise原型对象的then()
     * @param {*} onResolved  指定成功的回调函数
     * @param {*} onRejected  指定失败的回调函数
     * @returns 返回一个新的promise对象：返回promise的结果由onResolved/onRejected执行结果决定
     */
    then (onResolved, onRejected) {

      // 指定回调函数的默认值（必须是函数）
      onResolved = typeof onResolved === 'function' ? onResolved : value => value // 向后传递成功的value
      onRejected = typeof onRejected === 'function' ? onRejected : reason => {throw reason} // 向后传递失败的reason（实现错误/异常穿透的关键点）
      
      const self = this

      // 返回一个新的promise对象
      return new Promise((resolve, reject) => {

        /**
         * 调用指定回调函数处理
         * 根据执行结果，改变return的promise状态
         * @param {*} callback  onResolved || onRejected
         */
        function handle(callback) {
          // 返回promise的结果由onResolved/onRejected执行结果决定
          // 1. 如果抛出异常,return的promise就会失败,reason为异常
          // 2. 如果回调函数执行返回不是promise, return的promise就会成功,value就是返回的值
          // 3. 如果回调函数执行返回是promise, return的promise结果就是这个promise的结果
          try {
            const result = callback(self.data)
            if (result instanceof Promise) {
              // 返回是promise, return的promise结果就是这个promise的结果
              // result.then(
              //   value => resolve(value), // 当result成功时，让return的promise也成功
              //   reason => reject(reason) // 当result失败时，让return的promise也失败
              // )
              result.then(resolve, reject)
            } else { 
              // 返回不是promise, return的promise就会成功,value就是返回的值
              resolve(result)
            }
          } catch(error) { 
            // 如果抛出异常,return的promise就会失败,reason为异常
            reject(error)
          }
            
        }

        if (self.status === PENDING) {
          // 当前状态还是pending状态,将回调函数保存callbacks容器中缓存起来
          self.callbacks.push({
            onResolved(value){
              handle(onResolved)
            },
            onRejected(reason){
              handle(onRejected)
            }
          })
        } else if (self.status === RESOLVED) {
          // 异步执行onResolved并改变return的promise状态
          setTimeout(() => { 
            handle(onResolved)
          })
        } else { // rejected
          // 异步执行onRejected并改变return的promise状态
          setTimeout(() => { 
            handle(onRejected)
          })
        }
      })
    }


    /**
     * Promise原型对象的catch()
     * @param {*} onRejected 指定失败的回调函数
     * @returns 返回一个新的promise对象
     */
    catch (onRejected) {
      return this.then(undefined, onRejected)
    }

    
    /**
     * Promsie类对象的 resolve 方法
     * @param {*} value 
     * @returns 返回指定结果的成功/失败的promsie
     */
    static resolve = function (value) {
      return new Promise((resolve, reject) => {
        if(value instanceof Promise) {
          value.then(resolve, reject)
        } else {
          resolve(value)
        }
      })
    }


    /**
     * Promsie类对象的 reject 的方法
     * @param {*} reason 
     * @returns 返回一个指定reason的失败的promise
     */
     static reject = function (reason) {
      return new Promise((resolve, reject) => {
        reject(reason)
      })
    }



    /**
     * Promsie类对象的 all 的方法
     * @param {*} promises 
     * @returns 返回一个promsie, 只有当所有promise都成功时才成功,否则失败
     */
    static all = function (promises) {
      const values = new Array(promises.length) // 用来保存所有成功value的数组
      // 用来保存成功promise的数量
      let resolvedCount = 0
      // 返回一个新的promise
      return new Promise((resolve, reject) => {
        // 遍历获取每个promise的结果
        promises.forEach((p, index) => {
          // p.then(
          Promise.resolve(p).then(
            value => { // p成功，将成功的value保存到values
              resolvedCount++
              values[index] = value

              // 如果全部成功了，将return的promise改变成功
              if (resolvedCount === promises.length) {
                resolve(values)
              }
            },
            reason => { // 只要一个失败了，return的promise就失效
              reject(reason)
            }
          )
        })
      })
    }

    // Promsie类对象的 race 的方法
    // 返回一个promise,其结果由第一个完成的promise决定
    static race = function (promises) {
      return new Promise((resolve, reject) => {
        // 遍历获取每个promise的结果
        promises.forEach((p, index) => {
          // p.then(
          Promise.resolve(p).then(
            value => { // 一旦有成功了，将return变为成功
              resolve(value)
            },
            reason => { // 一旦有失败了，将return变为失败
              reject(reason)
            }
          )
        })
      })
    }


    /**
     * 自定义方法resolveDelay()
     * @param {*} value 
     * @param {*} time 
     * @returns 返回一个promise对象，它在指定的时间后才确定结果
     */
    static resolveDelay = function(value, time) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if(value instanceof Promise) {
            value.then(resolve, reject)
          } else {
            resolve(value)
          }
        }, time)
      })
    }


    /**
     * 自定义方法resolveDelay()
     * @param {*} reason 
     * @param {*} time 
     * @returns 返回一个promise对象，它在指定的时间后才失败
     */
    static rejectDelay = function(reason, time) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(reason)
        }, time)
      })
    }

  }
  
  // 向外暴露Promise函数
  window.Promise = Promise
})(window)