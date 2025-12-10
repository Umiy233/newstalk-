
/**
 * 文件切片和上传工具函数
 * 
 * @param file 文件
 * @param chunkSize 切片大小
 * @param onProgress 处理进度函数
 * @returns
 */
//文件切片，只对长度裁切，不具体数据裁切，无性能消耗

export const createChunks = (file: File, chunkSize: number) => {
    const result: Blob[] = []  //输出切片数组
    for (let i = 0; i < file.size; i += chunkSize) {
        result.push(file.slice(i, i + chunkSize))
    }
    return result
}

/**
 * 检查文件是否已存在（秒传）
 */
export const checkFileExists = async (hash: string, filename: string, size: number): Promise<{ exists: boolean; url?: string } | null> => {
    const { apiClient } = await import('@/utils/api')
    try {
        const response = await apiClient.post<{ exists: boolean; url?: string }>('/upload/check', {
            hash,
            filename,
            size
        })
        return response.data || null
    } catch (error) {
        console.error('检查文件失败:', error)
        return null
    }
}

/**
 * 查询已上传的分片（断点续传）
 */
export const getUploadedChunks = async (hash: string): Promise<Array<{ chunkIndex: number }>> => {
    const { apiClient } = await import('@/utils/api')
    try {
        const response = await apiClient.get<{ chunks: Array<{ chunkIndex: number }> }>(`/upload/chunks/${hash}`)
        return response.data?.chunks || []
    } catch (error) {
        console.error('查询已上传分片失败:', error)
        return []
    }
}

/**
 * 上传单个分片
 */
export const uploadChunk = async (
    hash: string,
    chunkIndex: number,
    chunk: Blob,
    onProgress?: (progress: number) => void
) => {
    const { apiClient } = await import('@/utils/api')
    const formData = new FormData()
    formData.append('hash', hash)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('chunk', chunk)
    
    try {
        const response = await apiClient.upload('/upload/chunk', formData, onProgress)
        return response.data
    } catch (error) {
        console.error(`上传分片 ${chunkIndex} 失败:`, error)
        throw error
    }
}

/**
 * 合并所有分片
 */
export const mergeChunks = async (hash: string, filename: string, totalChunks: number): Promise<{ url: string }> => {
    const { apiClient } = await import('@/utils/api')
    try {
        const response = await apiClient.post<{ url: string }>('/upload/merge', {
            hash,
            filename,
            totalChunks
        })
        return response.data || { url: '' }
    } catch (error) {
        console.error('合并分片失败:', error)
        throw error
    }
}

export const hash = (chunks: Blob[], fileSize: number, onProgress?: any): Promise<string> => {
    return new Promise((resolve, reject) => {
        // 创建webWorker多线程实例
        const worker = new Worker('/utils/fileChunk/hash-worker.js')

        //监听worker发出信息
        worker.onmessage = e => {
            const { type, progress, hash } = e.data

            if (type === 'initSuccess') {
                _read(0)
            }
            else if (type === 'progress') {
                // 如需在组件中显示进度，可在这里通过回调函数传出
                if (onProgress) {
                    onProgress(progress)
                }
            }
            else if (type === 'result') {
                worker.terminate()
                resolve(hash)
            }
        }
        // 3. 监听Worker错误
        worker.onerror = error => {
            worker.terminate() // 出错时终止Worker
            reject(new Error(`Worker计算错误:${error.message}`))
        }

        //读取文件
        function _read(i: number) {
            if (i >= chunks.length) {
                worker.postMessage({ type: 'complete' })
                return
            }

            const blob = chunks[i] //单个切片
            const reader = new FileReader()
            reader.onload = (e: any) => {
                const bytes = e.target.result // 读取到的字节
                // 修复：检查 chunks 是否为空，并优化进度计算
                const chunkSize = chunks.length > 0 ? chunks[0].size : 0
                const processSize = (i + 1) * chunkSize //已处理大小
                const progress = Math.min(Math.floor((processSize / fileSize) * 100), 100)
                //向worker发送当前分片数据和进度
                worker.postMessage({
                    type: 'append',
                    data: {
                        chunk: bytes,
                        progress: progress,
                    }
                })
                _read(i + 1)
            }
            //读取失败处理
            reader.onerror = () => {
                worker.postMessage({ type: 'error' })
                worker.terminate()//关闭
                reject(new Error('文件分片读取失败'))
            }
            reader.readAsArrayBuffer(blob)
        }
        // 初始化Worker（开始处理前先发送初始化消息）
        worker.postMessage({ type: 'init' })
    })
}
