const AdherenceSummary = () => {
    const adherenceRate = 85 // This would be calculated based on actual data
  
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Weekly Adherence</h3>
          <div className="mt-5">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    {adherenceRate}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                <div
                  style={{ width: `${adherenceRate}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                ></div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Great job! You've taken {adherenceRate}% of your medications as prescribed this week.
          </p>
        </div>
      </div>
    )
  }
  
  export default AdherenceSummary
  
  