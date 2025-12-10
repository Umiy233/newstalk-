importScripts('/utils/fileChunk/spark-md5.min.js')

// 初始spark实例
let spark = null

// 接受主线程发送的消息
self.onmessage = (e) => {
    const { type, data } = e.data;

    if (type === 'init') {
        spark = new SparkMD5.ArrayBuffer();
        // 向主线程反馈初始化完成
        self.postMessage({ type: 'initSuccess' });
    }
    // 2. 处理分片数据
    else if (type === 'append') {
        // 追加当前分片数据到spark实例
        spark.append(data.chunk);
        self.postMessage({
            type: 'progress',
            progress: data.progress
        })
    }
    // 3. 完成计算
    else if (type === 'complete') {
        const hash = spark.end();
        spark.destroy();
        self.postMessage({
            type: 'result',
            hash: hash
        })
    }
    // 4.错误处理
    else if (type === 'error') {
        spark?.destroy();
    }

}
