import { Link, useParams } from 'react-router-dom';
import { ManagedInstanceForm } from '../components/ManagedInstanceForm';
import { useServerStore } from '../stores/useServerStore';

export function EditServerInstance() {
  const { id = '' } = useParams();
  const server = useServerStore((state) => state.servers.find((item) => item.id === id));

  if (!server) {
    return (
      <div className="p-6">
        <div className="panel p-8 text-sm text-slate-600">
          实例不存在或仍在加载。
          <Link className="ml-2 font-medium text-slate-900 underline" to="/dashboard">
            返回 Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ManagedInstanceForm
      kind={server.type === 'velocity' || server.type === 'custom' ? server.type : 'minecraft'}
      server={server}
      title="编辑托管实例"
      description="修改实例名称、工作目录、启动命令、关闭命令和运行策略。这里仍然只管理已有实例，不生成开服配置。"
      submitLabel="保存修改"
    />
  );
}
