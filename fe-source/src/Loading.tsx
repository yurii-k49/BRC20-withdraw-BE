export const Loading = () => {
  return (
    <div className="absolute top-0 w-full h-full z-20 bg-black/[.7]">
      <div className="flex justify-center items-center h-full">
        <div className="w-12 h-12 rounded-full animate-spin  border-x-4 border-solid border-[#3d7ef6] border-t-transparent"></div>
      </div>
    </div>
  );
};
