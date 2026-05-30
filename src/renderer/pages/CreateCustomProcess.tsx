import { ManagedInstanceForm } from '../components/ManagedInstanceForm';

export function CreateCustomProcess() {
  return (
    <ManagedInstanceForm
      kind="custom"
      title="添加通用托管实例"
      description="用于后端程序、脚本服务、机器人、MCP 等控制台进程。只记录工作目录、启动命令、关闭命令和运行策略。"
      submitLabel="保存进程"
    />
  );
}
