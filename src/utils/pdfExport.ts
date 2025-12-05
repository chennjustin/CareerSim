import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Report, Interview } from '../types';
import { format } from 'date-fns';

// 使用 html2canvas 导出 PDF（支持中英文）
export const exportReportToPDF = async (
  report: Report,
  interview: Interview,
  chatId?: string
): Promise<void> => {
  // 创建临时容器来渲染报告内容
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm'; // A4 宽度
  container.style.minHeight = '297mm'; // A4 高度
  container.style.backgroundColor = '#FFFFFF';
  container.style.fontFamily = 'Microsoft YaHei, PingFang SC, Helvetica Neue, Arial, sans-serif';
  document.body.appendChild(container);

  try {
    // 构建报告 HTML 内容
    const reportHTML = buildReportHTML(report, interview, chatId);
    container.innerHTML = reportHTML;

    // 等待内容渲染
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 使用 html2canvas 转换为图片
    const canvas = await html2canvas(container, {
      scale: 2, // 提高清晰度
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      width: container.offsetWidth,
      height: Math.min(container.scrollHeight, 297 * 3.779527559), // 限制为 A4 高度 (297mm in pixels)
    } as any);

    // 创建 PDF
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 宽度 (mm)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageHeight = pdf.internal.pageSize.getHeight();
    let heightLeft = imgHeight;
    let position = 0;

    // 添加第一页
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 如果内容超过一页，添加更多页面
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // 生成文件名
    const fileName = `${interview.title}_${format(new Date(report.createdAt), 'yyyyMMdd_HHmm')}.pdf`;

    // 保存 PDF
    pdf.save(fileName);
  } catch (error) {
    console.error('PDF 导出失败:', error);
    throw error;
  } finally {
    // 清理临时容器
    document.body.removeChild(container);
  }
};

// 构建报告 HTML 内容（优化为一页布局）
const buildReportHTML = (report: Report, interview: Interview, chatId?: string): string => {
  const gunmetal = '#22333B';
  const beaver = '#A37B7E';
  const lightGray = '#F2F4F3';

  return `
    <div style="background: white; padding: 15mm; font-family: 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif; line-height: 1.4;">
      <!-- 标题和基本信息 -->
      <div style="text-align: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid ${gunmetal};">
        <h1 style="font-size: 20px; font-weight: bold; color: ${gunmetal}; margin: 0 0 8px 0; letter-spacing: 1px;">
          面試評估報告 / Interview Assessment Report
        </h1>
        <div style="font-size: 11px; color: ${gunmetal}; margin: 4px 0;">
          <strong>${interview.title}</strong> | ${interview.type}
          ${chatId
            ? (() => {
                const chat = interview.chats.find((c) => c.id === chatId);
                return chat ? ` | ${chat.title}` : '';
              })()
            : ''}
        </div>
        <div style="font-size: 9px; color: #666; margin-top: 4px;">
          ${format(new Date(report.createdAt), 'yyyy年MM月dd日 HH:mm')}
        </div>
      </div>

      <!-- 总体评分和详细评分 - 并排显示 -->
      <div style="display: flex; gap: 15px; margin-bottom: 12px;">
        <!-- 左侧：总体评分 -->
        <div style="flex: 0 0 140px; text-align: center; padding: 10px; background: ${lightGray}; border-radius: 6px;">
          <div style="font-size: 11px; font-weight: bold; color: ${gunmetal}; margin-bottom: 8px;">
            總體評分<br/>Overall Score
          </div>
          <div style="display: inline-block; position: relative; width: 90px; height: 90px; margin-bottom: 5px;">
            <svg width="90" height="90" style="transform: rotate(-90deg);">
              <circle cx="45" cy="45" r="38" fill="none" stroke="#E0E0E0" stroke-width="6"/>
              <circle cx="45" cy="45" r="38" fill="none" stroke="${gunmetal}" stroke-width="6"
                stroke-dasharray="${2 * Math.PI * 38}"
                stroke-dashoffset="${2 * Math.PI * 38 * (1 - report.overallScore / 100)}"
                stroke-linecap="round"/>
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -85%); text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: ${gunmetal}; line-height: 1; margin: 0; padding: 0;">
                ${Math.round(report.overallScore)}
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：详细评分 -->
        <div style="flex: 1; padding: 10px; background: ${lightGray}; border-radius: 6px;">
          <div style="font-size: 11px; font-weight: bold; color: ${gunmetal}; margin-bottom: 8px;">
            詳細評分 / Detailed Scores
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            ${['表達', '內容', '結構', '語言']
              .map((label, index) => {
                const scores = [report.expression, report.content, report.structure, report.language];
                const score = scores[index];
                const labelsEn = ['Expression', 'Content', 'Structure', 'Language'];
                return `
                  <div style="text-align: center;">
                    <div style="display: inline-block; position: relative; width: 55px; height: 55px; margin-bottom: 3px;">
                      <svg width="55" height="55" style="transform: rotate(-90deg);">
                        <circle cx="27.5" cy="27.5" r="22" fill="none" stroke="#E0E0E0" stroke-width="4"/>
                        <circle cx="27.5" cy="27.5" r="22" fill="none" stroke="${gunmetal}" stroke-width="4"
                          stroke-dasharray="${2 * Math.PI * 22}"
                          stroke-dashoffset="${2 * Math.PI * 22 * (1 - score / 100)}"
                          stroke-linecap="round"/>
                      </svg>
                      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -85%);">
                        <div style="font-size: 13px; font-weight: bold; color: ${gunmetal}; line-height: 1; margin: 0; padding: 0;">
                          ${Math.round(score)}
                        </div>
                      </div>
                    </div>
                    <div style="font-size: 8px; color: ${gunmetal}; line-height: 1.2;">
                      ${label}<br/>${labelsEn[index]}
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>

      <!-- 三列布局：优势、改进、建议 -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px;">
        <!-- 优势总结 -->
        <div style="padding: 10px; background: white; border: 1px solid ${lightGray}; border-radius: 4px;">
          <h3 style="font-size: 11px; font-weight: bold; color: ${gunmetal}; margin: 0 0 8px 0; padding-bottom: 6px; border-bottom: 1px solid ${lightGray};">
            優勢總結<br/><span style="font-size: 9px; font-weight: normal;">Strengths</span>
          </h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${report.strengths
              .map(
                (strength) => `
              <li style="font-size: 9px; color: ${gunmetal}; margin-bottom: 6px; padding-left: 16px; position: relative; line-height: 1.4;">
                <span style="position: absolute; left: 0; color: #4CAF50; font-weight: bold;">✓</span>
                ${strength}
              </li>
            `
              )
              .join('')}
          </ul>
        </div>

        <!-- 改进建议 -->
        <div style="padding: 10px; background: white; border: 1px solid ${lightGray}; border-radius: 4px;">
          <h3 style="font-size: 11px; font-weight: bold; color: ${gunmetal}; margin: 0 0 8px 0; padding-bottom: 6px; border-bottom: 1px solid ${lightGray};">
            改進建議<br/><span style="font-size: 9px; font-weight: normal;">Areas for Improvement</span>
          </h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${report.improvements
              .map(
                (improvement) => `
              <li style="font-size: 9px; color: ${beaver}; margin-bottom: 6px; padding-left: 16px; position: relative; line-height: 1.4;">
                <span style="position: absolute; left: 0; color: ${beaver}; font-weight: bold;">•</span>
                ${improvement}
              </li>
            `
              )
              .join('')}
          </ul>
        </div>

        <!-- 练习建议 -->
        <div style="padding: 10px; background: white; border: 1px solid ${lightGray}; border-radius: 4px;">
          <h3 style="font-size: 11px; font-weight: bold; color: ${gunmetal}; margin: 0 0 8px 0; padding-bottom: 6px; border-bottom: 1px solid ${lightGray};">
            練習建議<br/><span style="font-size: 9px; font-weight: normal;">Recommendations</span>
          </h3>
          <div>
            ${report.recommendations
              .map(
                (rec) => `
              <div style="font-size: 9px; color: ${gunmetal}; margin-bottom: 6px; padding: 6px; background: ${lightGray}; border-radius: 3px; line-height: 1.4;">
                ${rec}
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>

      <!-- 页脚 -->
      <div style="text-align: center; padding-top: 8px; border-top: 1px solid ${lightGray}; margin-top: 8px;">
        <p style="font-size: 8px; color: #999; margin: 0;">
          CareerSim - AI 模擬面試平台 / AI Interview Simulation Platform
        </p>
      </div>
    </div>
  `;
};

