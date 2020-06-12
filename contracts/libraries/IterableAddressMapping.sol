/** 
Original Library from https://github.com/ethereum/dapp-bin/blob/master/library/iterable_mapping.sol
Library adapted to payable address and extended by https://github.com/giobart with the methods: from_array, key_array, val_array, get
*/
library IterableAddressMapping
{
    struct itmap
    {
        mapping(address payable => IndexValue) data;
        KeyFlag[] keys;
        uint size;
    }
    struct IndexValue { uint keyIndex; uint value; }
    struct KeyFlag { address payable key; bool deleted; }

    function insert(itmap storage self, address payable key, uint value) returns (bool replaced)
    {
        uint keyIndex = self.data[key].keyIndex;
        self.data[key].value = value;
        if (keyIndex > 0)
        return true;
        else
        {
        keyIndex = self.keys.length++;
        self.data[key].keyIndex = keyIndex + 1;
        self.keys[keyIndex].key = key;
        self.size++;
        return false;
        }
    }

    function from_array(itmap storage self, address payable [] array, uint initval)
    {
        for (uint i=0; i<array.length; i++) 
        {
            insert(self,array[i],initval)
        }
    }

    function key_array(itmap storage data) returns (address payable [] keys)
    {
        address payable [] keys
        for (var i = iterate_start(data); iterate_valid(data, i); i = iterate_next(data, i))
        {
            var (key, value) = iterate_get(data, i);
            keys.push(key)
        }
        return keys
    {
    }

    function val_array(itmap storage self) returns (address payable [] values)
    {
        address payable [] values
        for (var i = iterate_start(data); iterate_valid(data, i); i = iterate_next(data, i))
        {
            var (key, value) = iterate_get(data, i);
            values.push(value)
        }
        return values
    }

    function remove(itmap storage self, address payable key) returns (bool success)
    {
        uint keyIndex = self.data[key].keyIndex;
        if (keyIndex == 0)
        return false;
        delete self.data[key];
        self.keys[keyIndex - 1].deleted = true;
        self.size --;
    }

    function contains(itmap storage self, address payable key) returns (bool)
    {
        return self.data[key].keyIndex > 0;
    }

    function iterate_start(itmap storage self) returns (uint keyIndex)
    {
        return iterate_next(self, uint(-1));
    }

    function iterate_valid(itmap storage self, uint keyIndex) returns (bool)
    {
        return keyIndex < self.keys.length;
    }

    function iterate_next(itmap storage self, uint keyIndex) returns (uint r_keyIndex)
    {
        keyIndex++;
        while (keyIndex < self.keys.length && self.keys[keyIndex].deleted)
        keyIndex++;
        return keyIndex;
    }

    function iterate_get(itmap storage self, uint keyIndex) returns (address payable key, uint value)
    {
        key = self.keys[keyIndex].key;
        value = self.data[key].value;
    }
    
}