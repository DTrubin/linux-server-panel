import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

/**
 * 图像处理工具类
 */
class ImageProcessor {
  /**
   * 压缩并调整头像图片
   * @param {string} inputPath - 输入文件路径
   * @param {string} outputPath - 输出文件路径
   * @param {Object} options - 压缩选项
   * @returns {Promise<Object>} 处理结果
   */
  static async compressAvatar(inputPath, outputPath, options = {}) {
    try {
      const {
        width = 200,           // 默认宽度 200px
        height = 200,          // 默认高度 200px
        quality = 85,          // WebP 质量 (1-100)
        format = 'webp',       // 输出格式，统一使用 WebP
        progressive = true,    // 渊进式加载
        strip = true          // 移除元数据
      } = options;

      // 获取输入文件信息
      const inputStats = fs.statSync(inputPath);
      const inputSizeKB = Math.round(inputStats.size / 1024);

      // 使用 sharp 处理图像
      const processor = sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',          // 保持宽高比，裁剪多余部分
          position: 'center'     // 从中心裁剪
        });

      // 根据格式设置压缩参数，优先使用 WebP
      if (format === 'webp') {
        processor
          .webp({
            quality,
            effort: 6,          // WebP 压缩努力程度 (0-6)，6为最高质量
            lossless: false,    // 使用有损压缩获得更小文件
            nearLossless: false,
            smartSubsample: true // 智能子采样
          });
      } else if (format === 'jpeg' || format === 'jpg') {
        processor
          .jpeg({
            quality,
            progressive,
            mozjpeg: true        // 使用 mozjpeg 编码器
          });
      } else if (format === 'png') {
        processor
          .png({
            quality,
            progressive,
            compressionLevel: 8  // PNG 压缩级别 (0-9)
          });
      }

      // 移除元数据
      if (strip) {
        processor.withMetadata({
          exif: {},
          icc: false,
          iptc: false,
          xmp: false
        });
      }

      // 执行压缩
      await processor.toFile(outputPath);

      // 获取输出文件信息
      const outputStats = fs.statSync(outputPath);
      const outputSizeKB = Math.round(outputStats.size / 1024);
      const compressionRatio = Math.round((1 - outputStats.size / inputStats.size) * 100);

      return {
        success: true,
        inputSize: inputSizeKB,
        outputSize: outputSizeKB,
        compressionRatio,
        format,
        dimensions: { width, height }
      };

    } catch (error) {
      throw new Error(`图像压缩失败: ${error.message}`);
    }
  }

  /**
   * 验证图像文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 验证结果
   */
  static async validateImage(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      
      return {
        valid: true,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: metadata.size,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * 生成缩略图
   * @param {string} inputPath - 输入文件路径
   * @param {string} outputPath - 输出文件路径
   * @param {number} size - 缩略图尺寸
   * @returns {Promise<void>}
   */
  static async generateThumbnail(inputPath, outputPath, size = 64) {
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .webp({
          quality: 80,
          effort: 6,
          smartSubsample: true
        })
        .toFile(outputPath);
    } catch (error) {
      throw new Error(`缩略图生成失败: ${error.message}`);
    }
  }

  /**
   * 清理临时文件
   * @param {string} filePath - 文件路径
   */
  static cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`清理临时文件失败: ${error.message}`);
    }
  }

  /**
   * 批量转换现有头像为 WebP 格式
   * @param {string} avatarDir - 头像目录路径
   * @returns {Promise<Object>} 转换结果
   */
  static async convertExistingAvatarsToWebP(avatarDir = 'uploads/avatars/') {
    const results = {
      converted: 0,
      failed: 0,
      errors: []
    };

    try {
      if (!fs.existsSync(avatarDir)) {
        return results;
      }

      const files = fs.readdirSync(avatarDir);
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext) && !file.includes('_thumb');
      });

      for (const file of imageFiles) {
        try {
          const inputPath = path.join(avatarDir, file);
          const baseName = path.basename(file, path.extname(file));
          const outputPath = path.join(avatarDir, `${baseName}.webp`);
          const thumbnailPath = path.join(avatarDir, `${baseName}_thumb.webp`);

          // 转换主头像
          await this.compressAvatar(inputPath, outputPath, {
            width: 200,
            height: 200,
            quality: 85,
            format: 'webp'
          });

          // 生成缩略图
          await this.generateThumbnail(inputPath, thumbnailPath, 64);

          // 删除旧文件
          this.cleanupFile(inputPath);
          
          // 清理旧的缩略图
          const oldThumbnailExts = ['.jpg', '.jpeg', '.png'];
          oldThumbnailExts.forEach(ext => {
            const oldThumbPath = path.join(avatarDir, `${baseName}_thumb${ext}`);
            this.cleanupFile(oldThumbPath);
          });

          results.converted++;
        } catch (error) {
          results.failed++;
          results.errors.push(`转换 ${file} 失败: ${error.message}`);
        }
      }
    } catch (error) {
      results.errors.push(`读取目录失败: ${error.message}`);
    }

    return results;
  }
}

export default ImageProcessor;
