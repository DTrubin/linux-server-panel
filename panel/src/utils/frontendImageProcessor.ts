/**
 * 前端图片处理工具
 * 用于头像上传前的预处理和 WebP 转换
 */

// 定义类型接口
interface ImageValidationResult {
  valid: boolean;
  errors: string[];
}

interface ImageInfo {
  width: number;
  height: number;
  aspectRatio: number;
  size: number;
  type: string;
}

interface ProcessOptions {
  width?: number;
  height?: number;
  quality?: number;
  outputFormat?: string;
  fallbackFormat?: string;
  fit?: string;
}

interface CropOptions {
  outputWidth?: number;
  outputHeight?: number;
  quality?: number;
  outputFormat?: string;
  fallbackFormat?: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProcessedImage {
  blob: Blob;
  previewUrl: string;
  canvas: HTMLCanvasElement;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
  format: string;
  webpSupported: boolean;
  cropArea?: CropArea;
}

interface ThumbnailResult {
  blob: Blob;
  dataUrl: string;
  format: string;
  webpSupported: boolean;
}

class FrontendImageProcessor {
  /**
   * 检查浏览器是否支持 WebP
   * @returns {boolean}
   */
  static supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * 检查浏览器是否支持 Canvas
   * @returns {boolean}
   */
  static supportsCanvas(): boolean {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d'));
  }

  /**
   * 验证图片文件
   * @param {File} file - 图片文件
   * @returns {Promise<ImageValidationResult>} 验证结果
   */
  static validateImage(file: File): Promise<ImageValidationResult> {
    return new Promise((resolve) => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      const result: ImageValidationResult = {
        valid: true,
        errors: []
      };

      // 检查文件类型
      if (!validTypes.includes(file.type)) {
        result.valid = false;
        result.errors.push('不支持的文件格式，请选择 JPG、PNG、GIF 或 WebP 格式的图片');
      }

      // 检查文件大小
      if (file.size > maxSize) {
        result.valid = false;
        result.errors.push('文件大小不能超过 5MB');
      }

      resolve(result);
    });
  }

  /**
   * 获取图片尺寸信息
   * @param {File} file - 图片文件
   * @returns {Promise<ImageInfo>} 图片信息
   */
  static getImageInfo(file: File): Promise<ImageInfo> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          size: file.size,
          type: file.type
        });
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        reject(new Error('无法读取图片信息'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 调整图片尺寸并转换为 WebP 格式
   * @param {File} file - 原始图片文件
   * @param {ProcessOptions} options - 处理选项
   * @returns {Promise<ProcessedImage>} 处理结果
   */
  static async resizeAndConvertToWebP(file: File, options: ProcessOptions = {}): Promise<ProcessedImage> {
    const {
      width = 200,
      height = 200,
      quality = 0.85,
      outputFormat = 'image/webp', // 默认转换为 WebP
      fallbackFormat = 'image/jpeg', // 不支持 WebP 时的备用格式
      fit = 'cover'
    } = options;

    if (!this.supportsCanvas()) {
      throw new Error('浏览器不支持 Canvas，无法处理图片');
    }

    // 检查 WebP 支持
    const webpSupported = this.supportsWebP();
    const finalFormat = webpSupported ? outputFormat : fallbackFormat;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          if (!ctx) {
            reject(new Error('无法创建Canvas上下文'));
            return;
          }

          // 计算裁剪区域
          const scale = Math.max(width / img.width, height / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;

          // 设置画布尺寸
          canvas.width = width;
          canvas.height = height;

          // 填充白色背景（WebP 可能有透明背景）
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);

          // 计算居中位置
          const x = (width - scaledWidth) / 2;
          const y = (height - scaledHeight) / 2;

          // 绘制图片
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

          // 转换为指定格式
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('图片转换失败'));
              return;
            }

            const previewUrl = URL.createObjectURL(blob);
            const originalSize = file.size;
            const compressedSize = blob.size;
            const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);

            resolve({
              blob,
              previewUrl,
              canvas,
              originalSize: Math.round(originalSize / 1024), // KB
              compressedSize: Math.round(compressedSize / 1024), // KB
              compressionRatio,
              dimensions: { width, height },
              format: finalFormat,
              webpSupported
            });
          }, finalFormat, quality);

        } catch (error) {
          reject(error instanceof Error ? error : new Error('未知错误'));
        } finally {
          URL.revokeObjectURL(img.src);
        }
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
        URL.revokeObjectURL(img.src);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 生成 WebP 格式缩略图
   * @param {File} file - 原始图片文件
   * @param {number} size - 缩略图尺寸
   * @returns {Promise<ThumbnailResult>} 缩略图信息
   */
  static generateWebPThumbnail(file: File, size = 64): Promise<ThumbnailResult> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        if (!ctx) {
          reject(new Error('无法创建Canvas上下文'));
          return;
        }

        canvas.width = size;
        canvas.height = size;

        const scale = Math.max(size / img.width, size / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (size - scaledWidth) / 2;
        const y = (size - scaledHeight) / 2;

        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

        // 检查 WebP 支持
        const webpSupported = this.supportsWebP();
        const format = webpSupported ? 'image/webp' : 'image/jpeg';
        const quality = webpSupported ? 0.8 : 0.7;

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('缩略图生成失败'));
            return;
          }

          const dataUrl = canvas.toDataURL(format, quality);
          resolve({
            blob,
            dataUrl,
            format,
            webpSupported
          });
        }, format, quality);

        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        reject(new Error('缩略图生成失败'));
        URL.revokeObjectURL(img.src);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 生成基于裁剪的 WebP 缩略图
   * @param {File} file - 原始图片文件
   * @param {CropArea} cropArea - 裁剪区域
   * @param {number} size - 缩略图尺寸
   * @returns {Promise<ThumbnailResult>} 缩略图信息
   */
  static generateCroppedWebPThumbnail(file: File, cropArea: CropArea, size = 64): Promise<ThumbnailResult> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        if (!ctx) {
          reject(new Error('无法创建Canvas上下文'));
          return;
        }

        canvas.width = size;
        canvas.height = size;

        // 填充背景
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, size, size);

        // 从裁剪区域生成缩略图
        ctx.drawImage(
          img,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height,
          0, 0, size, size
        );

        const webpSupported = this.supportsWebP();
        const format = webpSupported ? 'image/webp' : 'image/jpeg';
        const quality = webpSupported ? 0.8 : 0.7;

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('裁剪缩略图生成失败'));
            return;
          }

          const dataUrl = canvas.toDataURL(format, quality);
          resolve({
            blob,
            dataUrl,
            format,
            webpSupported
          });
        }, format, quality);

        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        reject(new Error('裁剪缩略图生成失败'));
        URL.revokeObjectURL(img.src);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 创建 WebP 格式的文件对象
   * @param {Blob} blob - 图片 Blob 对象
   * @param {string} filename - 文件名
   * @returns {File} WebP 格式的文件对象
   */
  static createWebPFile(blob: Blob, filename = 'avatar.webp'): File {
    // 确保文件名有正确的扩展名
    const name = filename.endsWith('.webp') ? filename : filename.replace(/\.[^/.]+$/, '.webp');

    return new File([blob], name, {
      type: 'image/webp',
      lastModified: Date.now()
    });
  }

  /**
   * 清理资源
   * @param {string} url - 需要清理的 Object URL
   */
  static cleanup(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * 完整的头像处理流程 - 直接转换为 WebP
   * @param {File} file - 原始图片文件
   * @returns {Promise<Object>} 处理结果
   */
  static async processAvatarToWebP(file: File): Promise<{
    success: boolean;
    original?: {
      file: File;
      info: ImageInfo;
    };
    processed?: ProcessedImage;
    thumbnail?: ThumbnailResult;
    webpFile?: File;
    webpSupported?: boolean;
    error?: string;
  }> {
    try {
      // 1. 验证文件
      const validation = await this.validateImage(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // 2. 获取图片信息
      const imageInfo = await this.getImageInfo(file);

      // 3. 转换为 WebP 格式并调整尺寸
      const processResult = await this.resizeAndConvertToWebP(file, {
        width: 200,
        height: 200,
        quality: 0.85,
        outputFormat: 'image/webp'
      });

      // 4. 生成 WebP 缩略图
      const thumbnailResult = await this.generateWebPThumbnail(file, 64);

      // 5. 创建 WebP 文件对象
      const webpFile = this.createWebPFile(processResult.blob, 'avatar.webp');

      return {
        success: true,
        original: {
          file,
          info: imageInfo
        },
        processed: processResult,
        thumbnail: thumbnailResult,
        webpFile, // 用于上传的 WebP 文件
        webpSupported: processResult.webpSupported
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 根据裁剪区域处理图片
   * @param {File} file - 原始图片文件
   * @param {CropArea} cropArea - 裁剪区域 {x, y, width, height}
   * @param {CropOptions} options - 处理选项
   * @returns {Promise<ProcessedImage>} 处理结果
   */
  static async cropAndConvertToWebP(file: File, cropArea: CropArea, options: CropOptions = {}): Promise<ProcessedImage> {
    const {
      outputWidth = 200,
      outputHeight = 200,
      quality = 0.85,
      outputFormat = 'image/webp',
      fallbackFormat = 'image/jpeg'
    } = options;

    if (!this.supportsCanvas()) {
      throw new Error('浏览器不支持 Canvas，无法处理图片');
    }

    const webpSupported = this.supportsWebP();
    const finalFormat = webpSupported ? outputFormat : fallbackFormat;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          if (!ctx) {
            reject(new Error('无法创建Canvas上下文'));
            return;
          }

          // 设置画布尺寸为目标尺寸
          canvas.width = outputWidth;
          canvas.height = outputHeight;

          // 填充白色背景
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, outputWidth, outputHeight);

          // 从原图裁剪指定区域并绘制到画布
          ctx.drawImage(
            img,
            cropArea.x, cropArea.y, cropArea.width, cropArea.height, // 源区域
            0, 0, outputWidth, outputHeight // 目标区域
          );

          // 转换为指定格式
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('图片裁剪转换失败'));
              return;
            }

            const previewUrl = URL.createObjectURL(blob);
            const originalSize = file.size;
            const compressedSize = blob.size;
            const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);

            resolve({
              blob,
              previewUrl,
              canvas,
              originalSize: Math.round(originalSize / 1024),
              compressedSize: Math.round(compressedSize / 1024),
              compressionRatio,
              dimensions: { width: outputWidth, height: outputHeight },
              format: finalFormat,
              webpSupported,
              cropArea
            });
          }, finalFormat, quality);

        } catch (error) {
          reject(error instanceof Error ? error : new Error('未知错误'));
        } finally {
          URL.revokeObjectURL(img.src);
        }
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
        URL.revokeObjectURL(img.src);
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

export default FrontendImageProcessor;
