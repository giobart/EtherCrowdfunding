/** 
Original Library from https://github.com/ethereum/dapp-bin/blob/master/library/iterable_mapping.sol
Library adapted to payable address and extended by https://github.com/giobart with the methods: from_array, key_array, val_array, get
*/
pragma solidity >=0.6.0 <0.7.0;

library IterableAddressMapping
{
    struct itmap
    {
        mapping(address => IndexValue) data;
        KeyFlag[] keys;
        uint size;
    }
    struct IndexValue { uint keyIndex; uint value; }
    struct KeyFlag { address key; bool deleted; }

    function insert(itmap storage self, address payable key, uint value) public returns (bool replaced)
    {
        uint keyIndex = self.data[key].keyIndex;
        self.data[key].value = value;
        if (keyIndex > 0)
            return true;
        else
        {
            keyIndex = self.keys.length;
            self.data[key].keyIndex = keyIndex;
            self.keys[keyIndex].key = key;
            self.size++;
            return false;
        }
    }

    function from_array(itmap storage self, address payable [] memory _array, uint initval) public
    {
        for (uint i=0; i<_array.length; i++) 
        {
            insert(self,_array[i],initval);
        }
    }

    function key_array(itmap storage data) public view returns (address payable [] memory _keys) 
    {
        _keys = new address payable [](data.size);
        for (uint i = iterate_start(data); iterate_valid(data, i); i = iterate_next(data, i))
        {
            (address payable key,) = iterate_get(data, i);
            _keys[i]=key;
        }
    }

    function val_array(itmap storage data) public view returns (uint [] memory _values) 
    {
        _values = new uint [](data.size);
        for (uint i = iterate_start(data); iterate_valid(data, i); i = iterate_next(data, i))
        {
            (, uint value) = iterate_get(data, i);
            _values[i]=value;
        }
    }

    function remove(itmap storage self, address payable key) public returns (bool success) 
    {
        uint keyIndex = self.data[key].keyIndex;
        if (keyIndex == 0)
        return false;
        delete self.data[key];
        self.keys[keyIndex - 1].deleted = true;
        self.size --;
    }

    function contains(itmap storage self, address payable key) public view returns (bool) 
    {
        return self.data[key].keyIndex > 0;
    }

    function iterate_start(itmap storage self) public view returns (uint keyIndex) 
    {
        return iterate_next(self, uint(-1));
    }

    function iterate_valid(itmap storage self, uint keyIndex) public view returns (bool) 
    {
        return keyIndex < self.keys.length;
    }

    function iterate_next(itmap storage self, uint keyIndex) public view returns (uint r_keyIndex) 
    {
        keyIndex++;
        while (keyIndex < self.keys.length && self.keys[keyIndex].deleted)
        keyIndex++;
        return keyIndex;
    }

    function iterate_get(itmap storage self, uint keyIndex) public view returns (address payable key, uint value) 
    {
        key = payable(self.keys[keyIndex].key);
        value = self.data[key].value;
    }
    
}