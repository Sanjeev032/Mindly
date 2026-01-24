const StatCard = ({ title, value, icon, color }) => {
    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-white">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg bg-opacity-20 ${color}`}>
                {icon}
            </div>
        </div>
    );
};

export default StatCard;
